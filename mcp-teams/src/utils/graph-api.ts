import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { handleTeamsApiError, TeamsApiErrorShape } from './errors.js';
import { logger } from './logger.js';

const BASE_URL = 'https://graph.microsoft.com/v1.0';
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function parseRetryAfterSeconds(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export interface GraphRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  query?: Record<string, string | number | boolean | undefined>;
  body?: unknown;
  headers?: Record<string, string>;
}

interface GraphEnvelope {
  error?: {
    code?: string;
    message?: string;
    innerError?: unknown;
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${normalizedPath}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function callGraphApi<T>(path: string, options: GraphRequestOptions = {}): Promise<T> {
  const token = getCurrentToken();
  const url = buildUrl(path, options.query);

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

  const envelope = (typeof data === 'object' && data !== null ? data : {}) as GraphEnvelope;

  if (!response.ok) {
    const retryAfterSeconds = parseRetryAfterSeconds(response.headers.get('retry-after'));
    throw {
      status: response.status,
      graphCode: envelope.error?.code,
      message: envelope.error?.message || 'Microsoft Graph HTTP request failed',
      details: data,
      retryAfterSeconds,
    } satisfies TeamsApiErrorShape & { retryAfterSeconds?: number };
  }

  return data as T;
}

export async function withTeamsRetry<T>(
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
        throw handleTeamsApiError(
          {
            status: 401,
            graphCode: 'InvalidAuthenticationToken',
            message: error.message,
            details: { reason: error.message },
          },
          context
        );
      }

      const parsed =
        typeof error === 'object' && error !== null ? (error as Record<string, unknown>) : {};
      const status = typeof parsed.status === 'number' ? parsed.status : undefined;
      const graphCode = typeof parsed.graphCode === 'string' ? parsed.graphCode : undefined;
      const retryAfterSeconds =
        typeof parsed.retryAfterSeconds === 'number' && Number.isFinite(parsed.retryAfterSeconds)
          ? parsed.retryAfterSeconds
          : undefined;
      const retryable = status !== undefined && RETRYABLE_STATUS.has(status);

      if (!retryable || attempt === maxAttempts) {
        throw handleTeamsApiError(
          {
            status,
            graphCode,
            message:
              typeof parsed.message === 'string' ? parsed.message : 'Microsoft Graph request failed',
            details: parsed.details,
          },
          context
        );
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);

      logger.warn(`[GraphAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
        graphCode,
      });

      await sleep(delayMs);
    }
  }

  throw handleTeamsApiError(
    {
      message: 'Teams API retry exhausted',
      details: lastError,
    },
    context
  );
}

export function summarizeIdentity(from: unknown): unknown {
  if (!from || typeof from !== 'object') {
    return null;
  }

  const typed = from as Record<string, unknown>;
  const user = typed.user as Record<string, unknown> | undefined;
  const app = typed.application as Record<string, unknown> | undefined;

  return {
    user: user
      ? {
          id: user.id,
          displayName: user.displayName,
          userIdentityType: user.userIdentityType,
        }
      : null,
    application: app
      ? {
          id: app.id,
          displayName: app.displayName,
        }
      : null,
  };
}

export function summarizeMessage(message: Record<string, unknown>): Record<string, unknown> {
  return {
    id: message.id,
    replyToId: message.replyToId,
    messageType: message.messageType,
    subject: message.subject,
    summary: message.summary,
    importance: message.importance,
    createdDateTime: message.createdDateTime,
    lastModifiedDateTime: message.lastModifiedDateTime,
    deletedDateTime: message.deletedDateTime,
    from: summarizeIdentity(message.from),
    body: message.body,
    webUrl: message.webUrl,
    reactions: message.reactions,
  };
}
