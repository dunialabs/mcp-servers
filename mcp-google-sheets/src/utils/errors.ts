import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum SheetsErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  QuotaExceeded = -32033,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  return new McpError(code, message, data);
}

interface ApiErrorShape {
  code?: number;
  message?: string;
  response?: { status?: number; data?: unknown };
  errors?: unknown;
}

function asApiErrorShape(error: unknown): ApiErrorShape {
  if (typeof error !== 'object' || error === null) {
    return {};
  }
  return error as ApiErrorShape;
}

export function handleSheetsApiError(error: unknown, context: string): McpError {
  if (error instanceof McpError) {
    return error;
  }

  const parsed = asApiErrorShape(error);
  const status = parsed.response?.status ?? parsed.code;
  const message = parsed.message || 'Unknown Google Sheets API error';
  const details = parsed.response?.data || parsed.errors;

  logger.error(`[SheetsAPI] ${context}`, { status, message, details });

  if (status === 401) {
    return createMcpError(
      SheetsErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Google integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      SheetsErrorCode.PermissionDenied,
      'Permission denied. Verify Sheets scope includes https://www.googleapis.com/auth/spreadsheets.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(SheetsErrorCode.NotFound, `Resource not found. ${message}`, details);
  }

  if (status === 429) {
    return createMcpError(
      SheetsErrorCode.RateLimited,
      'Rate limit exceeded. Retry after a short delay.',
      details
    );
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return createMcpError(
      SheetsErrorCode.ApiUnavailable,
      'Google API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(SheetsErrorCode.InternalError, `${context}: ${message}`, { status, details });
}
