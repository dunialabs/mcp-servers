/**
 * MCP Error Handling Utilities for MySQL MCP Server
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes (custom range: -32010 to -32099)
 */
export enum MysqlErrorCode {
  // MCP Standard Errors
  ParseError = ErrorCode.ParseError,         // -32700
  InvalidRequest = ErrorCode.InvalidRequest, // -32600
  MethodNotFound = ErrorCode.MethodNotFound, // -32601
  InvalidParams = ErrorCode.InvalidParams,   // -32602
  InternalError = ErrorCode.InternalError,   // -32603

  // MySQL-specific errors
  DatabaseConnectionFailed = -32010,
  QueryExecutionFailed = -32011,
  TransactionFailed = -32012,
  InvalidQuery = -32013,
  PermissionDenied = -32014,
  TableNotFound = -32015,
  QueryTimeout = -32016,
  DatabaseNotFound = -32017,
}

export function createMcpError(code: number, message: string, data?: unknown): McpError {
  logger.error(`[McpError] Code: ${code}, Message: ${message}`, data);
  return new McpError(code, message, data);
}

export function createInvalidParamsError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InvalidParams, message, data);
}

export function createInternalError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InternalError, message, data);
}

export function createConnectionError(message: string, data?: unknown): McpError {
  return createMcpError(
    MysqlErrorCode.DatabaseConnectionFailed,
    `Database connection failed: ${message}`,
    data
  );
}

export function createQueryError(message: string, data?: unknown): McpError {
  return createMcpError(
    MysqlErrorCode.QueryExecutionFailed,
    `Query execution failed: ${message}`,
    data
  );
}

/**
 * MySQL error interface
 * mysql2 exposes numeric error codes via the `errno` field
 */
interface MysqlError {
  errno?: number;
  code?: string;
  message: string;
  sqlState?: string;
  sqlMessage?: string;
}

function isMysqlError(error: unknown): error is MysqlError {
  return (
    error !== null &&
    typeof error === 'object' &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string' &&
    ('errno' in error || 'code' in error)
  );
}

export function handleUnknownError(error: unknown, context: string): McpError {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`[${context}] Error:`, errorMessage);

  if (error instanceof McpError) {
    return error;
  }

  if (isMysqlError(error)) {
    const errno = error.errno;

    switch (errno) {
      case 1044: // Access denied for database
      case 1045: // Access denied for user
        return createMcpError(
          MysqlErrorCode.PermissionDenied,
          `Permission denied: ${error.message}`
        );
      case 1049: // Unknown database
        return createMcpError(
          MysqlErrorCode.DatabaseNotFound,
          `Database not found: ${error.message}`
        );
      case 1051: // Unknown table (DROP TABLE)
      case 1146: // Table doesn't exist
        return createMcpError(
          MysqlErrorCode.TableNotFound,
          `Table not found: ${error.message}`
        );
      case 1054: // Unknown column
      case 1064: // SQL syntax error
        return createMcpError(
          MysqlErrorCode.InvalidQuery,
          `Invalid query: ${error.message}`
        );
      case 1062: // Duplicate entry (unique violation)
      case 1213: // Deadlock found
        return createQueryError(error.message, { errno, sqlState: error.sqlState });
      case 1205: // Lock wait timeout
      case 3024: // Query execution interrupted (max_execution_time)
        return createMcpError(
          MysqlErrorCode.QueryTimeout,
          `Query timeout: ${error.message}`
        );
      default:
        return createQueryError(error.message, {
          errno,
          code: error.code,
          sqlState: error.sqlState,
        });
    }
  }

  return createInternalError(
    `${context}: ${errorMessage}`,
    error instanceof Error ? { stack: error.stack } : undefined
  );
}
