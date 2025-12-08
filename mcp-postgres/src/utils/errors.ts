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
 * For application-specific errors, use the custom range -32010 to -32099 (avoiding official codes).
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes (custom range: -32010 to -32099)
 * These extend MCP standard errors without conflicting with official codes
 */
export enum PostgresErrorCode {
  // MCP Standard Errors (from official ErrorCode enum)
  ParseError = ErrorCode.ParseError, // -32700: Invalid JSON
  InvalidRequest = ErrorCode.InvalidRequest, // -32600: Invalid request
  MethodNotFound = ErrorCode.MethodNotFound, // -32601: Method not found
  InvalidParams = ErrorCode.InvalidParams, // -32602: Invalid parameters
  InternalError = ErrorCode.InternalError, // -32603: Internal error

  // PostgreSQL-specific errors (avoid -32000, -32001 which are used by MCP)
  DatabaseConnectionFailed = -32010, // Database connection failed
  QueryExecutionFailed = -32011, // Query execution error
  TransactionFailed = -32012, // Transaction error
  InvalidQuery = -32013, // Invalid SQL query
  PermissionDenied = -32014, // Operation not allowed in current mode
  TableNotFound = -32015, // Table does not exist
  QueryTimeout = -32016, // Query execution timeout
}

/**
 * Create a standardized MCP error
 *
 * @param code - Error code (use PostgresErrorCode enum or official ErrorCode)
 * @param message - Human-readable error message
 * @param data - Optional additional error data
 * @returns McpError instance
 */
export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] Code: ${code}, Message: ${message}`, data);
  return new McpError(code, message, data);
}

/**
 * Create an invalid parameters error (most common for tool input validation)
 */
export function createInvalidParamsError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InvalidParams, message, data);
}

/**
 * Create an internal error (for unexpected errors)
 */
export function createInternalError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InternalError, message, data);
}

/**
 * Create a database connection error
 */
export function createConnectionError(message: string, data?: unknown): McpError {
  return createMcpError(
    PostgresErrorCode.DatabaseConnectionFailed,
    `Database connection failed: ${message}`,
    data
  );
}

/**
 * Create a query execution error
 */
export function createQueryError(message: string, data?: unknown): McpError {
  return createMcpError(
    PostgresErrorCode.QueryExecutionFailed,
    `Query execution failed: ${message}`,
    data
  );
}

/**
 * Create a permission denied error
 */
export function createPermissionError(message: string): McpError {
  return createMcpError(
    PostgresErrorCode.PermissionDenied,
    `Permission denied: ${message} (readonly mode)`
  );
}

/**
 * PostgreSQL error interface
 */
interface PostgresError {
  code: string;
  message: string;
  severity?: string;
  detail?: string;
  hint?: string;
  position?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
}

/**
 * Type guard to check if an error is a PostgreSQL error
 *
 * @param error - The error to check
 * @returns true if the error is a PostgreSQL error
 */
function isPostgresError(error: unknown): error is PostgresError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as Record<string, unknown>).code === 'string' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

/**
 * Handle unknown errors and convert to MCP errors
 *
 * @param error - The caught error
 * @param context - Context description (e.g., "executeQuery tool")
 * @returns McpError instance
 */
export function handleUnknownError(error: unknown, context: string): McpError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`[${context}] Error:`, errorMessage);

  // If it's already an McpError, return it
  if (error instanceof McpError) {
    return error;
  }

  // Check if it's a PostgreSQL error using type guard
  if (isPostgresError(error)) {
    // Map common PostgreSQL error codes
    // See: https://www.postgresql.org/docs/current/errcodes-appendix.html
    switch (error.code) {
      case '42P01': // undefined_table
        return createMcpError(
          PostgresErrorCode.TableNotFound,
          `Table not found: ${error.message}`,
          { detail: error.detail, hint: error.hint }
        );
      case '42501': // insufficient_privilege
        return createMcpError(
          PostgresErrorCode.PermissionDenied,
          `Permission denied: ${error.message}`,
          { detail: error.detail, hint: error.hint }
        );
      case '57014': // query_canceled (timeout)
        return createMcpError(
          PostgresErrorCode.QueryTimeout,
          `Query timeout: ${error.message}`,
          { detail: error.detail }
        );
      case '23505': // unique_violation
        return createQueryError(`Unique constraint violation: ${error.message}`, {
          code: error.code,
          constraint: error.constraint,
          detail: error.detail,
        });
      case '23503': // foreign_key_violation
        return createQueryError(`Foreign key constraint violation: ${error.message}`, {
          code: error.code,
          constraint: error.constraint,
          detail: error.detail,
        });
      case '23502': // not_null_violation
        return createQueryError(`Not null constraint violation: ${error.message}`, {
          code: error.code,
          column: error.column,
          detail: error.detail,
        });
      default:
        return createQueryError(error.message, {
          code: error.code,
          detail: error.detail,
          hint: error.hint,
        });
    }
  }

  // Convert to internal error
  return createInternalError(
    `${context}: ${errorMessage}`,
    error instanceof Error ? { stack: error.stack } : undefined
  );
}
