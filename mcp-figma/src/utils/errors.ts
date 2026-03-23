import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum FigmaErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export interface FigmaApiErrorShape {
  status?: number;
  message?: string;
  details?: unknown;
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

export function handleFigmaApiError(error: FigmaApiErrorShape, context: string): McpError {
  const status = error.status;
  const details = error.details;

  if (status === 400) {
    return createMcpError(
      FigmaErrorCode.InvalidParams,
      'Invalid Figma request parameters.',
      details
    );
  }

  if (status === 401) {
    return createMcpError(
      FigmaErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Figma integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      FigmaErrorCode.PermissionDenied,
      'Permission denied. Verify Figma OAuth scopes and file access.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(FigmaErrorCode.NotFound, 'Figma resource not found.', details);
  }

  if (status === 429) {
    return createMcpError(
      FigmaErrorCode.RateLimited,
      'Figma API rate limit exceeded. Retry shortly.',
      details
    );
  }

  if (status !== undefined && status >= 500) {
    return createMcpError(
      FigmaErrorCode.ApiUnavailable,
      'Figma API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    FigmaErrorCode.InternalError,
    `${context}: ${error.message || 'Figma API error'}`,
    {
      status,
      details,
    }
  );
}
