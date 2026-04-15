import { getCurrentToken, TokenValidationError } from '../auth/token.js';
import { handleSlackApiError, SlackApiErrorShape } from './errors.js';
import { logger } from './logger.js';

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

type SlackResponse<T> = {
  ok?: boolean;
  error?: string;
} & T;

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

export async function callSlackApi<T extends Record<string, unknown>>(
  method: string,
  body?: Record<string, unknown>
): Promise<SlackResponse<T>> {
  const token = getCurrentToken();
  const params = body ?? {};
  const formBody = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&');
  const response = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8',
    },
    body: formBody,
  });

  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const retryAfter = parseRetryAfterSeconds(response.headers.get('retry-after'));
    throw {
      status: response.status,
      message: 'Slack HTTP request failed',
      details: data,
      retryAfterSeconds: retryAfter,
    } satisfies SlackApiErrorShape & { retryAfterSeconds?: number };
  }

  if (typeof data !== 'object' || data === null) {
    throw {
      status: response.status,
      message: 'Slack API returned non-JSON response',
      details: data,
    } satisfies SlackApiErrorShape;
  }

  const typed = data as SlackResponse<T>;
  if (!typed.ok) {
    throw {
      status: response.status,
      slackError: typed.error,
      message: `Slack API method ${method} failed`,
      details: typed,
    } satisfies SlackApiErrorShape;
  }

  return typed;
}

export async function withSlackRetry<T>(
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
        throw handleSlackApiError(
          {
            status: 401,
            slackError: 'not_authed',
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
        const shape: SlackApiErrorShape = {
          status,
          slackError: typeof parsed.slackError === 'string' ? parsed.slackError : undefined,
          message: typeof parsed.message === 'string' ? parsed.message : 'Slack API error',
          details: parsed.details,
        };
        throw handleSlackApiError(shape, context);
      }

      const delayMs =
        status === 429 && retryAfterSeconds !== undefined
          ? Math.max(1000, retryAfterSeconds * 1000)
          : 400 * 2 ** (attempt - 1);

      logger.warn(`[SlackAPI] ${context} retry ${attempt}/${maxAttempts} in ${delayMs}ms`, {
        status,
      });
      await sleep(delayMs);
    }
  }

  const fallbackShape: SlackApiErrorShape = {
    message: 'Slack API retry exhausted',
    details: lastError,
  };
  throw handleSlackApiError(fallbackShape, context);
}

export function summarizeChannel(channel: Record<string, unknown>) {
  return {
    id: channel.id,
    name: channel.name,
    isPrivate: channel.is_private,
    isArchived: channel.is_archived,
    numMembers: channel.num_members,
    topic: (channel.topic as { value?: string } | undefined)?.value,
    purpose: (channel.purpose as { value?: string } | undefined)?.value,
  };
}

export function summarizeUser(user: Record<string, unknown>) {
  const profile = (user.profile as Record<string, unknown> | undefined) ?? {};
  return {
    id: user.id,
    name: user.name,
    realName: profile.real_name,
    displayName: profile.display_name,
    email: profile.email,
    isBot: user.is_bot,
    deleted: user.deleted,
    tz: user.tz,
  };
}
