/**
 * Common utilities for Figma API tools
 */

import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { getCurrentToken } from '../auth/token.js';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { TokenValidationError } from '../auth/token.js';
import { FigmaApiErrorShape, handleFigmaApiError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export const FIGMA_API_BASE = 'https://api.figma.com/v1';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

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

async function callFigmaApi<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getCurrentToken();
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  const headers = {
    'X-Figma-Token': token,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers,
  };

  if (proxyUrl) {
    const agent = new HttpsProxyAgent(proxyUrl);
    (fetchOptions as RequestInit & { agent?: unknown }).agent = agent;
  }

  const response = await fetch(url, fetchOptions);
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
    throw {
      status: response.status,
      message: `Figma HTTP request failed (${response.status})`,
      details: data,
      retryAfterSeconds: parseRetryAfterSeconds(response.headers.get('retry-after')),
    } satisfies FigmaApiErrorShape & { retryAfterSeconds?: number };
  }

  return data as T;
}

async function withFigmaRetry<T>(
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
        throw handleFigmaApiError(
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
      const status = typeof parsed.status === 'number' ? parsed.status : undefined;
      const retryAfterSeconds =
        typeof parsed.retryAfterSeconds === 'number' && Number.isFinite(parsed.retryAfterSeconds)
          ? parsed.retryAfterSeconds
          : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleFigmaApiError(
          {
            status,
            message: typeof parsed.message === 'string' ? parsed.message : 'Figma API error',
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 500 * 2 ** (attempt - 1);

      logger.warn(`[FigmaAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
      });
      await sleep(delayMs);
    }
  }

  throw handleFigmaApiError(
    {
      message: 'Figma API retry exhausted',
      details: lastError,
    },
    context
  );
}

/**
 * Create fetch with Figma authentication and proxy support
 */
export function createFigmaFetch() {
  return async (url: string, options: RequestInit = {}): Promise<unknown> => {
    const pathname = new URL(url).pathname;
    return withFigmaRetry(() => callFigmaApi<unknown>(url, options), `Figma request failed: ${pathname}`);
  };
}

export function throwToolError(error: unknown, fallbackPrefix: string): never {
  if (error instanceof McpError) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  throw new Error(`${fallbackPrefix}: ${message}`);
}

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string | undefined | null): string {
  if (!timestamp) return 'N/A';
  try {
    return new Date(timestamp).toISOString();
  } catch {
    return timestamp;
  }
}
