import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { handleHubSpotApiError, HubSpotApiErrorShape } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

interface HubSpotRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
}

interface HubSpotFailureBody {
  status?: string;
  message?: string;
  category?: string;
  errors?: unknown[];
  [key: string]: unknown;
}

function parseRetryAfterSeconds(retryAfter: string | null): number | undefined {
  if (!retryAfter) {
    return undefined;
  }
  const parsed = Number(retryAfter);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>) {
  const url = new URL(path, 'https://api.hubapi.com');
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

export async function callHubSpotApi<T>(
  path: string,
  options: HubSpotRequestOptions = {}
): Promise<T> {
  const token = getCurrentToken();
  const method = options.method ?? 'GET';
  const url = buildUrl(path, options.query);

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const raw = await response.text();
  let data: unknown = null;
  if (raw.length > 0) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const parsedBody =
      typeof data === 'object' && data !== null ? (data as HubSpotFailureBody) : undefined;
    const retryAfter = parseRetryAfterSeconds(response.headers.get('retry-after'));
    throw {
      status: response.status,
      category: parsedBody?.category,
      message: parsedBody?.message ?? `HubSpot HTTP request failed (${response.status})`,
      details: data,
      retryAfterSeconds: retryAfter,
    } satisfies HubSpotApiErrorShape & { retryAfterSeconds?: number };
  }

  return data as T;
}

export async function withHubSpotRetry<T>(
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
        throw handleHubSpotApiError(
          {
            status: 401,
            message: error.message,
            details: { reason: error.message },
          },
          context
        );
      }

      const parsed =
        typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
      const statusValue = parsed.status;
      const status = typeof statusValue === 'number' ? statusValue : undefined;
      const retryAfterValue = parsed.retryAfterSeconds;
      const retryAfterSeconds =
        typeof retryAfterValue === 'number' && Number.isFinite(retryAfterValue)
          ? retryAfterValue
          : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleHubSpotApiError(
          {
            status,
            category: typeof parsed.category === 'string' ? parsed.category : undefined,
            message: typeof parsed.message === 'string' ? parsed.message : 'HubSpot API error',
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 500 * 2 ** (attempt - 1);

      logger.warn(`[HubSpotAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
      });
      await sleep(delayMs);
    }
  }

  throw handleHubSpotApiError(
    {
      message: 'HubSpot API retry exhausted',
      details: lastError,
    },
    context
  );
}

export function summarizeObject(result: Record<string, unknown>) {
  return {
    id: result.id,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
    archived: result.archived,
    properties: result.properties,
  };
}

export function ensureArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}
