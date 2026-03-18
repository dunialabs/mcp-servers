import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { FormsErrorCode, createMcpError, handleFormsApiError } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const FORMS_BASE = 'https://forms.googleapis.com/v1';
const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

interface GoogleErrorEnvelope {
  error?: {
    code?: number;
    message?: string;
    status?: string;
    details?: unknown;
  };
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(base: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${base}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function callGoogleApi<T>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = getCurrentToken();
  const url = buildUrl(base, path, options.query);

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const envelope = (typeof data === 'object' && data !== null ? data : {}) as GoogleErrorEnvelope;
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));

    throw {
      status: response.status,
      googleCode: envelope.error?.code,
      googleStatus: envelope.error?.status,
      message: envelope.error?.message || 'Google API request failed',
      details: envelope.error?.details ?? data,
      retryAfterSeconds,
    };
  }

  return data as T;
}

export async function callFormsApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return callGoogleApi<T>(FORMS_BASE, path, options);
}

export async function callDriveApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return callGoogleApi<T>(DRIVE_BASE, path, options);
}

export async function withFormsRetry<T>(
  fn: () => Promise<T>,
  context: string,
  maxAttempts = 3
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (error instanceof TokenValidationError) {
        throw handleFormsApiError(
          {
            status: 401,
            googleStatus: 'UNAUTHENTICATED',
            message: error.message,
            details: { reason: error.message },
          },
          context
        );
      }

      const parsed =
        typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};

      if (typeof parsed.code === 'number' && typeof parsed.message === 'string') {
        throw createMcpError(parsed.code, parsed.message, parsed.details);
      }

      const status = typeof parsed.status === 'number' ? parsed.status : undefined;
      const retryAfterSeconds =
        typeof parsed.retryAfterSeconds === 'number' && Number.isFinite(parsed.retryAfterSeconds)
          ? parsed.retryAfterSeconds
          : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleFormsApiError(
          {
            status,
            googleCode: typeof parsed.googleCode === 'number' ? parsed.googleCode : undefined,
            googleStatus: typeof parsed.googleStatus === 'string' ? parsed.googleStatus : undefined,
            message: typeof parsed.message === 'string' ? parsed.message : 'Google API error',
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);

      logger.warn(`[FormsAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
      });
      await sleep(delayMs);
    }
  }

  throw createMcpError(FormsErrorCode.InternalError, 'Retry exhausted', { context, lastError });
}

export function extractFormIdFromUrl(url: string): { formId: string | null; warning?: string } {
  const match = url.match(/\/forms\/d\/([^/]+)/);
  if (!match) {
    return { formId: null };
  }

  const formId = match[1];
  if (url.includes('/forms/d/e/')) {
    return {
      formId,
      warning:
        'This looks like a responder URL (/d/e/...). Extracted ID may not be an editable formId.',
    };
  }

  return { formId };
}

export function isRfc3339Utc(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);
}
