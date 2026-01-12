/**
 * Error Handling Utilities for Canva MCP Server
 *
 * Provides standardized error handling for Canva API errors,
 * mapping them to MCP error codes with user-friendly messages.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

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
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Authentication failed. Please check your Canva access token.`
        );

      case 403:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Permission denied. Your Canva account or token doesn't have access to this resource. ${error.message}`
        );

      case 404:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Resource not found. ${error.message}`
        );

      case 400:
      case 422:
        return new McpError(
          ErrorCode.InvalidParams,
          `[${context}] Invalid parameters. ${error.message}`
        );

      case 429:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Rate limit exceeded. Please try again later.`
        );

      case 408:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Request timeout. ${error.message}`
        );

      default:
        if (status >= 500) {
          return new McpError(
            ErrorCode.InternalError,
            `[${context}] Canva server error (${status}). ${error.message}`
          );
        }
        return new McpError(
          ErrorCode.InternalError,
          `[${context}] ${error.message}`
        );
    }
  }

  if (error instanceof Error) {
    logger.error(`[${context}] Unexpected error`, { error: error.message });
    return new McpError(
      ErrorCode.InternalError,
      `[${context}] ${error.message}`
    );
  }

  return new McpError(
    ErrorCode.InternalError,
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
