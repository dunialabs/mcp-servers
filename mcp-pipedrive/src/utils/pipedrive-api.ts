import { getAuthContext, TokenValidationError } from '../auth/token.js';
import { handlePipedriveApiError, PipedriveApiErrorShape } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

interface PipedriveRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

interface PipedriveResponseShape<T> {
  success?: boolean;
  data?: T;
  error?: string;
  error_info?: string;
  additional_data?: Record<string, unknown>;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(base: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(path, base);
  if (!query) {
    return url.toString();
  }

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export async function callPipedriveApi<T>(
  path: string,
  options: PipedriveRequestOptions = {}
): Promise<{ data: T; additionalData?: Record<string, unknown> }> {
  const auth = getAuthContext();
  const method = options.method ?? 'GET';
  const url = buildUrl(auth.apiDomain, path, options.query);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const raw = await response.text();
  let payload: unknown = null;
  if (raw.length > 0) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const retryAfter = response.headers.get('retry-after');
    const parsed = typeof payload === 'object' && payload !== null ? (payload as Record<string, unknown>) : undefined;

    throw {
      status: response.status,
      message: typeof parsed?.error === 'string' ? parsed.error : `Pipedrive HTTP request failed (${response.status})`,
      errorCode: typeof parsed?.error === 'string' ? parsed.error : undefined,
      details: payload,
      retryAfterSeconds: retryAfter ? Number(retryAfter) : undefined,
    } satisfies PipedriveApiErrorShape & { retryAfterSeconds?: number };
  }

  if (typeof payload !== 'object' || payload === null) {
    return { data: payload as T };
  }

  const typed = payload as PipedriveResponseShape<T>;
  if (typed.success === false) {
    throw {
      status: response.status,
      message: typed.error_info ?? typed.error ?? 'Pipedrive API returned success=false',
      errorCode: typed.error,
      details: typed,
    } satisfies PipedriveApiErrorShape;
  }

  return {
    data: (typed.data as T) ?? (payload as T),
    additionalData: typed.additional_data,
  };
}

export async function withPipedriveRetry<T>(
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
        throw handlePipedriveApiError(
          {
            status: 401,
            message: error.message,
            details: { reason: error.message },
          },
          context
        );
      }

      const parsed = typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
      const status = typeof parsed.status === 'number' ? parsed.status : undefined;
      const retryAfterSeconds = typeof parsed.retryAfterSeconds === 'number' ? parsed.retryAfterSeconds : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handlePipedriveApiError(
          {
            status,
            message: typeof parsed.message === 'string' ? parsed.message : 'Pipedrive API error',
            errorCode: typeof parsed.errorCode === 'string' ? parsed.errorCode : undefined,
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 500 * 2 ** (attempt - 1);

      logger.warn(`[PipedriveAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
      });
      await sleep(delayMs);
    }
  }

  throw handlePipedriveApiError(
    {
      message: 'Pipedrive API retry exhausted',
      details: lastError,
    },
    context
  );
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function formatToolResult(payload: unknown) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
  };
}
