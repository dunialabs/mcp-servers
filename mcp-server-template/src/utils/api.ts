/**
 * HTTP API Client Utility
 *
 * Provides a generic HTTP client with:
 * - Bearer token injection via getCurrentToken() from auth/token.ts
 * - Automatic retry with exponential backoff for 429 / 5xx responses
 * - Retry-After header support for rate limiting
 * - TokenValidationError → AuthenticationFailed conversion (no retry)
 * - Structured error objects mapped to MCP error codes via mapHttpStatusToAppErrorCode()
 *
 * Usage pattern (create a service-specific wrapper in your tool file or a
 * dedicated service layer — see example below):
 *
 *   import { callApi, withRetry } from '../utils/api.js';
 *
 *   const MY_API_BASE = 'https://api.example.com/v1';
 *
 *   export function callMyApi<T>(path: string, options?: RequestOptions) {
 *     return callApi<T>(MY_API_BASE, path, options);
 *   }
 *
 *   // In your tool handler:
 *   const data = await withRetry(
 *     () => callMyApi<MyResponse>('/items', { query: { limit: 50 } }),
 *     'myTool.listItems'
 *   );
 *
 * Auth note:
 *   callApi() always injects a Bearer token. If your server does NOT use token
 *   auth, remove the Authorization header from the fetch call below.
 *
 * Delete this file if your server does not make outbound HTTP API calls.
 */

import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { AppErrorCode, createMcpError, mapHttpStatusToAppErrorCode } from './errors.js';
import { logger } from './logger.js';

// HTTP status codes that are safe to retry
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

// Shape thrown by callApi() on non-2xx responses
interface RawApiError {
  status: number;
  message: string;
  details: unknown;
  retryAfterSeconds?: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build a full URL from a base, path, and optional query params.
 * Undefined values are omitted from the query string.
 */
export function buildUrl(
  base: string,
  path: string,
  query?: Record<string, string | number | boolean | undefined>
): string {
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

/**
 * Make an authenticated HTTP request.
 *
 * Throws a plain RawApiError object (not McpError) on non-2xx responses so
 * that withRetry() can inspect the status code and decide whether to retry.
 */
export async function callApi<T>(
  base: string,
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const token = getCurrentToken(); // throws TokenValidationError if missing/invalid
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
    const envelope = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
    const retryAfterRaw = response.headers.get('retry-after');
    const retryAfterParsed = retryAfterRaw ? Number(retryAfterRaw) : undefined;

    // Throw a plain object so withRetry() can read .status and .retryAfterSeconds
    const err: RawApiError = {
      status: response.status,
      message:
        (envelope.error as Record<string, unknown> | undefined)?.message as string
        ?? envelope.message as string
        ?? 'API request failed',
      details: data,
      retryAfterSeconds:
        retryAfterParsed !== undefined && Number.isFinite(retryAfterParsed)
          ? retryAfterParsed
          : undefined,
    };
    throw err;
  }

  return data as T;
}

/**
 * Execute fn() with automatic retry on retryable errors.
 *
 * Retry behaviour:
 * - TokenValidationError → immediately throw AuthenticationFailed (no retry)
 * - Already-McpError    → re-throw immediately
 * - HTTP 429/5xx        → retry up to maxAttempts with exponential backoff
 * - HTTP 429 + Retry-After → respect the server's requested wait time (min 1 s)
 * - All other errors    → convert status to AppErrorCode and throw
 */
export async function withRetry<T>(
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

      // Token missing or invalid — fail immediately, no point retrying
      if (error instanceof TokenValidationError) {
        throw createMcpError(
          AppErrorCode.AuthenticationFailed,
          'Token missing or invalid. Please reconnect.',
          { reason: error.message }
        );
      }

      const parsed =
        typeof error === 'object' && error !== null
          ? (error as Record<string, unknown>)
          : {};

      // Already an MCP-shaped error (code + message) — re-throw as-is
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
        const code =
          status !== undefined ? mapHttpStatusToAppErrorCode(status) : AppErrorCode.InternalError;
        throw createMcpError(
          code,
          typeof parsed.message === 'string' ? parsed.message : 'API error',
          parsed.details
        );
      }

      // Exponential backoff: 400 ms, 800 ms, …; respect Retry-After for 429
      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);

      logger.warn(`[api] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, { status });
      await sleep(delayMs);
    }
  }

  throw createMcpError(AppErrorCode.InternalError, 'Retry exhausted', { context, lastError });
}
