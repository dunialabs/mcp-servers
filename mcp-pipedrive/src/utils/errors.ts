import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum PipedriveErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  Conflict = -32033,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export interface PipedriveApiErrorShape {
  status?: number;
  message?: string;
  errorCode?: string;
  details?: unknown;
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export function handlePipedriveApiError(
  error: PipedriveApiErrorShape,
  context: string
): McpError {
  const status = error.status;
  const details = error.details;
  const errorCode = error.errorCode;

  if (status === 401) {
    return createMcpError(
      PipedriveErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Pipedrive integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      PipedriveErrorCode.PermissionDenied,
      'Permission denied. Verify Pipedrive app scopes and tenant permissions.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(PipedriveErrorCode.NotFound, 'Pipedrive resource not found.', details);
  }

  if (status === 409 || errorCode === 'conflict_error') {
    return createMcpError(
      PipedriveErrorCode.Conflict,
      'Pipedrive resource conflict. Verify resource state and duplicate constraints.',
      details
    );
  }

  if (status === 429) {
    return createMcpError(
      PipedriveErrorCode.RateLimited,
      'Pipedrive API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      PipedriveErrorCode.ApiUnavailable,
      'Pipedrive API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    PipedriveErrorCode.InternalError,
    `${context}: ${error.message || 'Pipedrive API error'}`,
    {
      status,
      errorCode,
      details,
    }
  );
}
