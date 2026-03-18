import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum FormsErrorCode {
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

export interface GoogleApiErrorShape {
  status?: number;
  googleCode?: number;
  googleStatus?: string;
  message?: string;
  details?: unknown;
}

export function handleFormsApiError(error: GoogleApiErrorShape, context: string): McpError {
  const status = error.status ?? error.googleCode;
  const googleStatus = error.googleStatus;
  const details = error.details;

  if (status === 401 || googleStatus === 'UNAUTHENTICATED') {
    return createMcpError(
      FormsErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Google integration.',
      details
    );
  }

  if (status === 403 || googleStatus === 'PERMISSION_DENIED') {
    return createMcpError(
      FormsErrorCode.PermissionDenied,
      'Permission denied. Verify Forms/Drive OAuth scopes are granted.',
      details
    );
  }

  if (status === 404 || googleStatus === 'NOT_FOUND') {
    return createMcpError(FormsErrorCode.NotFound, 'Google Forms resource not found.', details);
  }

  if (status === 429 || googleStatus === 'RESOURCE_EXHAUSTED') {
    return createMcpError(
      FormsErrorCode.RateLimited,
      'Google API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      FormsErrorCode.ApiUnavailable,
      'Google API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    FormsErrorCode.InternalError,
    `${context}: ${error.message || 'Google Forms API error'}`,
    {
      status,
      googleStatus,
      details,
    }
  );
}
