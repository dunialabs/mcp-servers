/**
 * Error Handling Utilities for Intercom MCP Server
 *
 * Provides standardized error handling for Intercom API errors,
 * mapping them to MCP error codes with user-friendly messages.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TokenValidationError } from '../auth/token.js';
import { logger } from './logger.js';
import type { IntercomErrorResponse } from '../types/index.js';

export enum IntercomMcpErrorCode {
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

/**
 * Intercom API Error
 */
export class IntercomError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public requestId?: string
  ) {
    super(message);
    this.name = 'IntercomError';
  }
}

/**
 * Handle Intercom API HTTP error response
 *
 * @param response - Failed HTTP response
 * @returns IntercomError with details
 */
export async function handleIntercomError(response: Response): Promise<IntercomError> {
  let errorData: IntercomErrorResponse | null = null;

  try {
    errorData = (await response.json()) as IntercomErrorResponse;
  } catch {
    // Response body is not JSON or empty
  }

  const firstError = errorData?.errors?.[0];
  const errorMessage =
    firstError?.message ||
    response.statusText ||
    `HTTP ${response.status}`;
  const status = response.status;
  const code = firstError?.code || `HTTP_${status}`;
  const requestId = errorData?.request_id;

  logger.error('[Intercom API] Error', {
    status,
    code,
    error: errorMessage,
    requestId,
    errors: errorData?.errors,
  });

  return new IntercomError(errorMessage, status, code, requestId);
}

/**
 * Convert Intercom errors to MCP errors
 *
 * Maps Intercom HTTP status codes to appropriate MCP error codes:
 * - 401: AuthenticationFailed - Invalid or expired token
 * - 403: PermissionDenied - Insufficient permissions or scope
 * - 404: ResourceNotFound - Resource doesn't exist
 * - 400/422: InvalidParams - Validation failed
 * - 429: TooManyRequests - Rate limit exceeded
 * - 5xx: InternalError - Intercom server error
 *
 * @param error - Error from Intercom API or other source
 * @param context - Operation context for error message
 * @returns McpError with appropriate code and message
 */
export function toMcpError(error: unknown, context: string): McpError {
  if (error instanceof TokenValidationError) {
    return createMcpError(
      IntercomMcpErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Intercom integration.',
      { context, reason: error.message }
    );
  }

  if (error instanceof IntercomError) {
    const status = error.status;

    switch (status) {
      case 401:
        return createMcpError(
          IntercomMcpErrorCode.AuthenticationFailed,
          'Authentication failed or token expired. Reconnect Intercom integration.',
          { status, context, requestId: error.requestId, code: error.code }
        );

      case 403:
        return createMcpError(
          IntercomMcpErrorCode.PermissionDenied,
          'Permission denied. Verify Intercom token scopes and workspace permissions.',
          { status, context, requestId: error.requestId, code: error.code }
        );

      case 404:
        return createMcpError(
          IntercomMcpErrorCode.NotFound,
          'Intercom resource not found.',
          { status, context, requestId: error.requestId, code: error.code }
        );

      case 400:
      case 422:
        return createMcpError(
          IntercomMcpErrorCode.InvalidParams,
          `Invalid parameters. ${error.message}`,
          { status, context, requestId: error.requestId, code: error.code }
        );

      case 429:
        return createMcpError(
          IntercomMcpErrorCode.RateLimited,
          'Intercom API rate limit exceeded. Retry shortly.',
          { status, context, requestId: error.requestId, code: error.code }
        );

      case 408:
        return createMcpError(
          IntercomMcpErrorCode.ApiUnavailable,
          `Intercom API timeout. ${error.message}`,
          { status, context, requestId: error.requestId, code: error.code }
        );

      default:
        if (status >= 500) {
          return createMcpError(
            IntercomMcpErrorCode.ApiUnavailable,
            'Intercom API temporarily unavailable. Retry shortly.',
            { status, context, requestId: error.requestId, code: error.code }
          );
        }
        return createMcpError(
          IntercomMcpErrorCode.InternalError,
          `[${context}] ${error.message}`,
          { status, context, requestId: error.requestId, code: error.code }
        );
    }
  }

  if (error instanceof Error) {
    logger.error(`[${context}] Unexpected error`, { error: error.message });
    return createMcpError(
      IntercomMcpErrorCode.InternalError,
      `[${context}] ${error.message}`
    );
  }

  return createMcpError(
    IntercomMcpErrorCode.InternalError,
    `[${context}] Unknown error occurred`
  );
}

/**
 * Convert unknown errors to McpError
 * Used in tool error handling
 */
export function handleUnknownError(error: unknown, context: string): McpError {
  return toMcpError(error, context);
}
