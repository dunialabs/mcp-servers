import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum BraveErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  Conflict = -32033,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export interface BraveApiErrorShape {
  status?: number;
  message?: string;
  code?: string;
  details?: unknown;
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export function handleBraveApiError(error: BraveApiErrorShape, context: string): McpError {
  const status = error.status;
  const code = error.code;

  if (code === 'OPTION_NOT_IN_PLAN') {
    return createMcpError(
      BraveErrorCode.PermissionDenied,
      'Permission denied. Current Brave plan does not include this feature.',
      error.details
    );
  }

  if (status === 400 || status === 422 || code === 'VALIDATION') {
    return createMcpError(
      BraveErrorCode.InvalidParams,
      error.message || 'Invalid Brave Search request parameters.',
      error.details
    );
  }

  if (status === 401) {
    return createMcpError(
      BraveErrorCode.AuthenticationFailed,
      'Authentication failed. Verify BRAVE_API_KEY.',
      error.details
    );
  }

  if (status === 403) {
    return createMcpError(
      BraveErrorCode.PermissionDenied,
      'Permission denied. Verify Brave Search plan and API key permissions.',
      error.details
    );
  }

  if (status === 404) {
    return createMcpError(BraveErrorCode.NotFound, 'Brave Search resource not found.', error.details);
  }

  if (status === 409) {
    return createMcpError(
      BraveErrorCode.Conflict,
      'Brave Search request conflict. Retry with adjusted parameters.',
      error.details
    );
  }

  if (status === 429) {
    return createMcpError(
      BraveErrorCode.RateLimited,
      'Brave Search API rate limit exceeded. Retry shortly.',
      error.details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      BraveErrorCode.ApiUnavailable,
      'Brave Search API temporarily unavailable. Retry shortly.',
      error.details
    );
  }

  return createMcpError(
    BraveErrorCode.InternalError,
    `${context}: ${error.message || 'Brave Search API error'}`,
    {
      status,
      code: error.code,
      details: error.details,
    }
  );
}
