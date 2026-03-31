/**
 * MCP Error Handling Utilities
 *
 * This module provides standardized error handling using MCP SDK's official ErrorCode enum.
 *
 * IMPORTANT: Only use the official MCP error codes defined in @modelcontextprotocol/sdk:
 * - ConnectionClosed = -32000
 * - RequestTimeout = -32001
 * - ParseError = -32700
 * - InvalidRequest = -32600
 * - MethodNotFound = -32601
 * - InvalidParams = -32602
 * - InternalError = -32603
 *
 * For application-specific errors, use a repository-wide convention in the
 * implementation-defined server-error range. This template currently uses:
 * - -32030 AuthenticationFailed
 * - -32031 PermissionDenied
 * - -32032 NotFound
 * - -32034 RateLimited
 * - -32035 ApiUnavailable
 *
 * Note: this is a repository convention for machine-readable connector errors,
 * not an MCP-only official requirement. Lightweight/demo tools may instead
 * return tool results with `isError: true` when machine classification is not needed.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes used by this repository's default template.
 * These extend MCP standard errors for connector/API failures where Core or
 * other platform components benefit from machine-readable error classes.
 *
 * When building a server that calls external APIs, map HTTP status codes to
 * the appropriate code here and throw via createMcpError().
 */
export enum AppErrorCode {
  // MCP Standard Errors (from official ErrorCode enum)
  ParseError = ErrorCode.ParseError,           // -32700: Invalid JSON
  InvalidRequest = ErrorCode.InvalidRequest,   // -32600: Invalid request
  MethodNotFound = ErrorCode.MethodNotFound,   // -32601: Method not found
  InvalidParams = ErrorCode.InvalidParams,     // -32602: Invalid parameters
  InternalError = ErrorCode.InternalError,     // -32603: Internal error

  // Application-specific errors (avoid -32000, -32001 which are used by MCP)
  NotFound = -32032,                           // Resource not found (HTTP 404)
  OperationFailed = -32011,                    // General operation failure
  ValidationFailed = -32012,                   // Data validation failed
  AuthenticationFailed = -32030,               // Token missing/expired (HTTP 401)
  PermissionDenied = -32031,                   // Insufficient scope (HTTP 403)
  RateLimited = -32034,                        // Rate limit hit (HTTP 429)
  ApiUnavailable = -32035,                     // Service error (HTTP 5xx)
}

/**
 * Create a standardized MCP error
 *
 * @param code - Error code (use AppErrorCode enum or official ErrorCode)
 * @param message - Human-readable error message
 * @param data - Optional additional error data
 * @returns McpError instance
 */
export function createMcpError(
  code: number,
  message: string,
  data?: unknown
): McpError {
  logger.error(`[McpError] Code: ${code}, Message: ${message}`, data);
  return new McpError(code, message, data);
}

/**
 * Create an invalid parameters error (most common for tool input validation)
 *
 * @param message - Description of what's wrong with the parameters
 * @param data - Optional data (e.g., validation errors)
 * @returns McpError with InvalidParams code
 */
export function createInvalidParamsError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InvalidParams, message, data);
}

/**
 * Create an internal error (for unexpected errors)
 *
 * @param message - Description of the internal error
 * @param data - Optional error data
 * @returns McpError with InternalError code
 */
export function createInternalError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InternalError, message, data);
}

/**
 * Map external API HTTP status codes to template AppErrorCode values.
 *
 * Recommended mapping:
 * - 401 -> AuthenticationFailed
 * - 403 -> PermissionDenied
 * - 404 -> NotFound
 * - 429 -> RateLimited
 * - 5xx -> ApiUnavailable
 * - others -> OperationFailed
 */
export function mapHttpStatusToAppErrorCode(status: number): AppErrorCode {
  if (status === 401) return AppErrorCode.AuthenticationFailed;
  if (status === 403) return AppErrorCode.PermissionDenied;
  if (status === 404) return AppErrorCode.NotFound;
  if (status === 429) return AppErrorCode.RateLimited;
  if (status >= 500 && status <= 599) return AppErrorCode.ApiUnavailable;
  return AppErrorCode.OperationFailed;
}

/**
 * Create an MCP error from an external API HTTP status code.
 */
export function createHttpStatusError(
  status: number,
  message: string,
  data?: unknown
): McpError {
  return createMcpError(mapHttpStatusToAppErrorCode(status), message, data);
}

/**
 * Handle unknown errors and convert to MCP errors
 *
 * @param error - The caught error
 * @param context - Context description (e.g., "echoMessage tool")
 * @returns McpError instance
 */
export function handleUnknownError(error: unknown, context: string): McpError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`[${context}] Error:`, errorMessage);

  // If it's already an McpError, return it
  if (error instanceof McpError) {
    return error;
  }

  // Convert to internal error
  return createInternalError(
    `${context}: ${errorMessage}`,
    error instanceof Error ? { stack: error.stack } : undefined
  );
}
