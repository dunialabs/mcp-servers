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
 * For application-specific errors, use the custom range -32000 to -32099 (avoiding official codes).
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes (custom range: -32010 to -32099)
 * These extend MCP standard errors without conflicting with official codes
 */
export enum AppErrorCode {
  // MCP Standard Errors (from official ErrorCode enum)
  ParseError = ErrorCode.ParseError,           // -32700: Invalid JSON
  InvalidRequest = ErrorCode.InvalidRequest,   // -32600: Invalid request
  MethodNotFound = ErrorCode.MethodNotFound,   // -32601: Method not found
  InvalidParams = ErrorCode.InvalidParams,     // -32602: Invalid parameters
  InternalError = ErrorCode.InternalError,     // -32603: Internal error

  // Application-specific errors (avoid -32000, -32001 which are used by MCP)
  ResourceNotFound = -32010,                   // Resource not found
  OperationFailed = -32011,                    // General operation failure
  ValidationFailed = -32012,                   // Data validation failed
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
