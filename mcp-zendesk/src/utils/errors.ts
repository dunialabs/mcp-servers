/**
 * Error Handling Utilities for Zendesk MCP Server
 *
 * Provides standardized error handling for Zendesk API errors,
 * mapping them to MCP error codes with user-friendly messages.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Zendesk API Error
 */
export class ZendeskError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string
  ) {
    super(message);
    this.name = 'ZendeskError';
  }
}

/**
 * Zendesk API Error Response
 */
export interface ZendeskErrorResponse {
  error: string;
  description?: string;
  details?: Record<string, unknown>;
}

/**
 * Handle Zendesk API HTTP error response
 *
 * @param response - Failed HTTP response
 * @returns ZendeskError with details
 */
export async function handleZendeskError(response: Response): Promise<ZendeskError> {
  let errorData: ZendeskErrorResponse | null = null;

  try {
    errorData = (await response.json()) as ZendeskErrorResponse;
  } catch {
    // Response body is not JSON or empty
  }

  const errorMessage = errorData?.error || errorData?.description || response.statusText;
  const status = response.status;

  logger.error('[Zendesk API] Error', {
    status,
    error: errorMessage,
    details: errorData?.details,
  });

  return new ZendeskError(errorMessage, status, `HTTP_${status}`);
}

/**
 * Convert Zendesk errors to MCP errors
 *
 * Maps Zendesk HTTP status codes to appropriate MCP error codes:
 * - 401: AuthenticationFailed - Invalid or expired credentials
 * - 403: PermissionDenied - Insufficient permissions
 * - 404: ResourceNotFound - Resource doesn't exist
 * - 422: InvalidParams - Validation failed
 * - 429: TooManyRequests - Rate limit exceeded
 * - 5xx: InternalError - Zendesk server error
 *
 * @param error - Error from Zendesk API or other source
 * @param context - Operation context for error message
 * @returns McpError with appropriate code and message
 */
export function toMcpError(error: unknown, context: string): McpError {
  if (error instanceof ZendeskError) {
    const status = error.status;

    switch (status) {
      case 401:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Authentication failed. Please check your Zendesk credentials.`
        );

      case 403:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Permission denied. Your Zendesk account doesn't have access to this resource.`
        );

      case 404:
        return new McpError(
          ErrorCode.InvalidRequest,
          `[${context}] Resource not found. ${error.message}`
        );

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
            `[${context}] Zendesk server error (${status}). ${error.message}`
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
