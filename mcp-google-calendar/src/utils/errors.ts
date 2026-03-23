import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum GoogleCalendarErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export interface GoogleCalendarApiErrorShape {
  status?: number;
  message?: string;
  details?: unknown;
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export function handleGoogleCalendarError(
  error: GoogleCalendarApiErrorShape,
  context: string
): McpError {
  const status = error.status;
  const details = error.details;

  if (status === 400) {
    return createMcpError(
      GoogleCalendarErrorCode.InvalidParams,
      'Invalid Google Calendar request parameters.',
      details
    );
  }

  if (status === 401) {
    return createMcpError(
      GoogleCalendarErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Google Calendar integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      GoogleCalendarErrorCode.PermissionDenied,
      'Permission denied. Verify Google Calendar scopes and calendar access.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(
      GoogleCalendarErrorCode.NotFound,
      'Google Calendar resource not found.',
      details
    );
  }

  if (status === 429) {
    return createMcpError(
      GoogleCalendarErrorCode.RateLimited,
      'Google Calendar API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      GoogleCalendarErrorCode.ApiUnavailable,
      'Google Calendar API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    GoogleCalendarErrorCode.InternalError,
    `${context}: ${error.message || 'Google Calendar API error'}`,
    {
      status,
      details,
    }
  );
}
