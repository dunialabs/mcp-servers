import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum GmailErrorCode {
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
  logger.error(`[McpError] code=${code} message=${message}`, data);
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

export function handleGmailApiError(error: unknown, context: string): McpError {
  const parsed = asApiErrorShape(error);
  const status = parsed.code || parsed.response?.status;
  const message = parsed.message || 'Unknown Gmail API error';
  const details = parsed.response?.data || parsed.errors;

  if (status === 401) {
    return createMcpError(
      GmailErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Gmail integration.',
      details
    );
  }

  if (status === 403) {
    return createMcpError(
      GmailErrorCode.PermissionDenied,
      'Permission denied. Verify Gmail scope includes https://www.googleapis.com/auth/gmail.modify.',
      details
    );
  }

  if (status === 404) {
    return createMcpError(GmailErrorCode.NotFound, `Resource not found. ${message}`, details);
  }

  if (status === 429) {
    return createMcpError(
      GmailErrorCode.RateLimited,
      'Rate limit exceeded. Retry after a short delay.',
      details
    );
  }

  if (status === 500 || status === 502 || status === 503 || status === 504) {
    return createMcpError(
      GmailErrorCode.ApiUnavailable,
      'Gmail API temporarily unavailable. Retry shortly.',
      details
    );
  }

  return createMcpError(
    GmailErrorCode.InternalError,
    `${context}: ${message}`,
    { status, details }
  );
}

export function validateStringArrayOrThrow(value: unknown, fieldName: string): asserts value is string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.trim().length === 0)) {
    throw createMcpError(GmailErrorCode.InvalidParams, `${fieldName} must be an array of non-empty strings`);
  }
}
