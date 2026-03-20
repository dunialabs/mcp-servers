import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { createMcpError, handleBraveApiError } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);
const DEFAULT_BASE = 'https://api.search.brave.com';

interface BraveApiErrorEnvelope {
  error?: {
    code?: string;
    message?: string;
    detail?: string;
  };
  message?: string;
  detail?: string;
  code?: string;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(base: string, path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(normalizedPath, base);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

function parseRetryAfterSeconds(headers: Headers): number | undefined {
  const retryAfterValue = headers.get('retry-after');
  if (retryAfterValue) {
    const parsed = Number(retryAfterValue);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  const resetValue = headers.get('x-ratelimit-reset');
  if (resetValue) {
    const parsedReset = Number(resetValue);
    if (Number.isFinite(parsedReset)) {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const delay = parsedReset - nowSeconds;
      if (delay > 0) {
        return delay;
      }
    }
  }

  return undefined;
}

export async function callBraveApi<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getCurrentToken();
  const base = process.env.BRAVE_API_BASE_URL || DEFAULT_BASE;
  const url = buildUrl(base, path, options.query);
  const apiVersion = process.env.BRAVE_API_VERSION;

  const response = await fetch(url, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': token,
      ...(options.body !== undefined ? { 'Content-Type': 'application/json; charset=utf-8' } : {}),
      ...(apiVersion ? { 'Api-Version': apiVersion } : {}),
      ...options.headers,
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
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
    const parsed = (typeof payload === 'object' && payload !== null
      ? payload
      : {}) as BraveApiErrorEnvelope;

    throw {
      status: response.status,
      message:
        parsed.error?.message ||
        parsed.error?.detail ||
        parsed.message ||
        parsed.detail ||
        `Brave API request failed (${response.status})`,
      code: parsed.error?.code || parsed.code,
      details: payload,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers),
    };
  }

  return payload as T;
}

export async function withBraveRetry<T>(fn: () => Promise<T>, context: string, maxAttempts = 3): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      if (error instanceof TokenValidationError) {
        throw handleBraveApiError(
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
      const retryAfterSeconds =
        typeof parsed.retryAfterSeconds === 'number' && Number.isFinite(parsed.retryAfterSeconds)
          ? parsed.retryAfterSeconds
          : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleBraveApiError(
          {
            status,
            message: typeof parsed.message === 'string' ? parsed.message : 'Brave API error',
            code: typeof parsed.code === 'string' ? parsed.code : undefined,
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);

      logger.warn(`[BraveAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, { status });
      await sleep(delayMs);
    }
  }

  throw createMcpError(-32603, 'Brave API retry exhausted', { context, lastError });
}
