/**
 * Error Handling Utilities for Canva MCP Server
 *
 * Provides standardized error handling for Canva API errors,
 * mapping them to MCP error codes with user-friendly messages.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

export enum CanvaErrorCode {
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
}

/**
 * Canva API Error
 */
export class CanvaError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'CanvaError';
  }
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] code=${code} message=${message}`, data);
  return new McpError(code, message, data);
}

/**
 * Canva API Error Response
 */
export interface CanvaErrorResponse {
  error: string;
  error_code?: string;
  message?: string;
  details?: Record<string, unknown>;
}

/**
 * Handle Canva API HTTP error response
 *
 * @param response - Failed HTTP response
 * @returns CanvaError with details
 */
export async function handleCanvaError(response: Response): Promise<CanvaError> {
  let errorData: CanvaErrorResponse | null = null;

  try {
    errorData = (await response.json()) as CanvaErrorResponse;
  } catch {
    // Response body is not JSON or empty
  }

  const errorMessage =
    errorData?.message ||
    errorData?.error ||
    response.statusText ||
    `HTTP ${response.status}`;
  const status = response.status;
  const code = errorData?.error_code || `HTTP_${status}`;

  logger.error('[Canva API] Error', {
    status,
    code,
    error: errorMessage,
    details: errorData?.details,
  });

  return new CanvaError(errorMessage, status, code);
}

/**
 * Convert Canva errors to MCP errors
 *
 * Maps Canva HTTP status codes to appropriate MCP error codes:
 * - 401: AuthenticationFailed - Invalid or expired token
 * - 403: PermissionDenied - Insufficient permissions or scope
 * - 404: ResourceNotFound - Resource doesn't exist
 * - 400/422: InvalidParams - Validation failed
 * - 429: TooManyRequests - Rate limit exceeded
 * - 5xx: InternalError - Canva server error
 *
 * @param error - Error from Canva API or other source
 * @param context - Operation context for error message
 * @returns McpError with appropriate code and message
 */
export function toMcpError(error: unknown, context: string): McpError {
  if (error instanceof CanvaError) {
    const status = error.status;

    switch (status) {
      case 401:
        return createMcpError(
          CanvaErrorCode.AuthenticationFailed,
          'Authentication failed or token expired. Reconnect Canva integration.'
        );

      case 403:
        return createMcpError(
          CanvaErrorCode.PermissionDenied,
          'Permission denied. Verify Canva scopes and resource access.'
        );

      case 404:
        return createMcpError(
          CanvaErrorCode.NotFound,
          'Canva resource not found.'
        );

      case 400:
      case 422:
        return createMcpError(
          CanvaErrorCode.InvalidParams,
          `[${context}] Invalid parameters. ${error.message}`
        );

      case 429:
        return createMcpError(
          CanvaErrorCode.RateLimited,
          'Canva API rate limit exceeded. Retry shortly.'
        );

      case 408:
        return createMcpError(
          CanvaErrorCode.ApiUnavailable,
          'Canva API request timed out. Retry shortly.'
        );

      default:
        if (status >= 500) {
          return createMcpError(
            CanvaErrorCode.ApiUnavailable,
            'Canva API temporarily unavailable. Retry shortly.'
          );
        }
        return createMcpError(
          CanvaErrorCode.InternalError,
          `[${context}] ${error.message}`
        );
    }
  }

  if (error instanceof Error) {
    logger.error(`[${context}] Unexpected error`, { error: error.message });
    return createMcpError(
      CanvaErrorCode.InternalError,
      `[${context}] ${error.message}`
    );
  }

  return createMcpError(
    CanvaErrorCode.InternalError,
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
