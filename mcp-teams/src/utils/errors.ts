import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum TeamsErrorCode {
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

export interface TeamsApiErrorShape {
  status?: number;
  graphCode?: string;
  message?: string;
  details?: unknown;
}

export function handleTeamsApiError(error: TeamsApiErrorShape, context: string): McpError {
  const status = error.status;
  const graphCode = error.graphCode;
  const details = error.details;

  if (
    status === 401 ||
    graphCode === 'InvalidAuthenticationToken' ||
    graphCode === 'invalid_token'
  ) {
    return createMcpError(
      TeamsErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Teams integration.',
      details
    );
  }

  if (status === 403 || graphCode === 'Forbidden' || graphCode === 'insufficient_claims') {
    return createMcpError(
      TeamsErrorCode.PermissionDenied,
      'Permission denied. Verify Microsoft Graph scopes and admin consent.',
      details
    );
  }

  if (status === 404 || graphCode === 'NotFound' || graphCode === 'ResourceNotFound') {
    return createMcpError(TeamsErrorCode.NotFound, 'Teams resource not found.', details);
  }

  if (status === 429 || graphCode === 'TooManyRequests') {
    return createMcpError(
      TeamsErrorCode.RateLimited,
      'Microsoft Graph rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      TeamsErrorCode.ApiUnavailable,
      'Microsoft Graph API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    TeamsErrorCode.InternalError,
    `${context}: ${error.message || 'Teams API error'}`,
    {
      status,
      graphCode,
      details,
    }
  );
}
