import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum SlackErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export interface SlackApiErrorShape {
  status?: number;
  slackError?: string;
  message?: string;
  details?: unknown;
}

export function handleSlackApiError(error: SlackApiErrorShape, context: string): McpError {
  const status = error.status;
  const slackError = error.slackError;
  const details = error.details;

  if (status === 401 || slackError === 'invalid_auth' || slackError === 'not_authed') {
    return createMcpError(
      SlackErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Slack integration.',
      details
    );
  }

  if (
    status === 403 ||
    slackError === 'missing_scope' ||
    slackError === 'no_permission' ||
    slackError === 'not_in_channel'
  ) {
    return createMcpError(
      SlackErrorCode.PermissionDenied,
      'Permission denied. Verify app scopes and channel membership.',
      details
    );
  }

  if (
    status === 404 ||
    slackError === 'channel_not_found' ||
    slackError === 'message_not_found' ||
    slackError === 'user_not_found'
  ) {
    return createMcpError(SlackErrorCode.NotFound, 'Slack resource not found.', details);
  }

  if (status === 429 || slackError === 'ratelimited') {
    return createMcpError(
      SlackErrorCode.RateLimited,
      'Slack API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      SlackErrorCode.ApiUnavailable,
      'Slack API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    SlackErrorCode.InternalError,
    `${context}: ${slackError ? `${slackError} - ` : ''}${error.message || 'Slack API error'}`,
    {
      status,
      slackError,
      details,
    }
  );
}
