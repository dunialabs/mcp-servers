/**
 * MCP Error Handling Utilities
 * Provides standardized error responses using MCP SDK error types
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes (extends MCP standard error codes)
 */
export enum NotionErrorCode {
  // MCP Standard Errors (from ErrorCode enum)
  ParseError = ErrorCode.ParseError,           // -32700: Invalid JSON
  InvalidRequest = ErrorCode.InvalidRequest,   // -32600: Invalid request
  MethodNotFound = ErrorCode.MethodNotFound,   // -32601: Method not found
  InvalidParams = ErrorCode.InvalidParams,     // -32602: Invalid parameters
  InternalError = ErrorCode.InternalError,     // -32603: Internal error

  // Notion specific errors (custom range: -32000 to -32099)
  PageNotFound = -32010,                       // Page not found
  DatabaseNotFound = -32011,                   // Database not found
  BlockNotFound = -32012,                      // Block not found
  PermissionDenied = -32013,                   // Permission denied
  InvalidPageId = -32014,                      // Invalid page ID format
  InvalidDatabaseId = -32015,                  // Invalid database ID format
  InvalidBlockId = -32016,                     // Invalid block ID format
  AuthenticationFailed = -32017,               // Authentication failed
  TokenExpired = -32018,                       // Access token expired
  NetworkError = -32019,                       // Network/API communication error
  RateLimitExceeded = -32020,                  // Rate limit exceeded
  ValidationFailed = -32021,                   // Validation failed
  ConflictError = -32022,                      // Conflict error (version mismatch)
}

/**
 * Create a standardized MCP error
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
 * Handle Notion API errors and convert to MCP errors
 */
export function handleNotionError(error: any, context: string): McpError {
  // Log the original error for debugging
  logger.error(`[Notion] ${context}:`, error);

  // Extract error details from Notion API error
  const statusCode = error?.status;
  const errorCode = error?.code;
  const errorMessage = error?.message || 'Unknown error';

  // Preserve error context for debugging
  const errorData: any = {
    context,
    notionCode: errorCode,
    originalMessage: error?.message,
  };

  // Include sanitized stack trace in development mode
  if (process.env.NODE_ENV === 'development' && error?.stack) {
    // Sanitize stack trace to remove sensitive paths
    errorData.stack = error.stack
      // Replace user home directories with generic paths
      .replace(/\/Users\/[^/]+/g, '/app')
      .replace(/\/home\/[^/]+/g, '/app')
      .replace(/C:\\Users\\[^\\]+/g, 'C:\\app')
      // Limit stack depth to first 10 lines for security and readability
      .split('\n')
      .slice(0, 10)
      .join('\n');
  }

  // Map Notion API errors to MCP error codes
  switch (statusCode) {
    case 404:
      return createMcpError(
        NotionErrorCode.PageNotFound,
        `Resource not found: ${errorMessage}`,
        errorData
      );

    case 403:
      return createMcpError(
        NotionErrorCode.PermissionDenied,
        `Permission denied: ${errorMessage}`,
        errorData
      );

    case 401:
      return createMcpError(
        NotionErrorCode.AuthenticationFailed,
        `Authentication failed: ${errorMessage}`,
        errorData
      );

    case 400:
      return createMcpError(
        NotionErrorCode.InvalidParams,
        `Invalid request: ${errorMessage}`,
        errorData
      );

    case 409:
      return createMcpError(
        NotionErrorCode.ConflictError,
        `Conflict error: ${errorMessage}`,
        errorData
      );

    case 429:
      return createMcpError(
        NotionErrorCode.RateLimitExceeded,
        `Rate limit exceeded: ${errorMessage}`,
        errorData
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return createMcpError(
        NotionErrorCode.NetworkError,
        `Notion API error: ${errorMessage}`,
        errorData
      );

    default:
      errorData.statusCode = statusCode;
      return createMcpError(
        ErrorCode.InternalError,
        `${context}: ${errorMessage}`,
        errorData
      );
  }
}

/**
 * Validate Notion ID format (UUID with hyphens removed)
 */
function isValidNotionId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // Notion IDs are UUIDs with hyphens removed (32 hex chars)
  // Or UUIDs with hyphens (36 chars)
  const withoutHyphens = /^[a-f0-9]{32}$/i;
  const withHyphens = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

  return withoutHyphens.test(id) || withHyphens.test(id);
}

/**
 * Validate page ID and throw MCP error if invalid
 */
export function validatePageIdOrThrow(pageId: string, paramName = 'pageId'): void {
  if (!pageId || typeof pageId !== 'string' || pageId.trim() === '') {
    throw createMcpError(
      NotionErrorCode.InvalidPageId,
      `Invalid ${paramName}: must be a non-empty string`
    );
  }

  if (!isValidNotionId(pageId)) {
    throw createMcpError(
      NotionErrorCode.InvalidPageId,
      `Invalid ${paramName}: must be a valid Notion UUID`
    );
  }
}

/**
 * Validate database ID and throw MCP error if invalid
 */
export function validateDatabaseIdOrThrow(databaseId: string, paramName = 'databaseId'): void {
  if (!databaseId || typeof databaseId !== 'string' || databaseId.trim() === '') {
    throw createMcpError(
      NotionErrorCode.InvalidDatabaseId,
      `Invalid ${paramName}: must be a non-empty string`
    );
  }

  if (!isValidNotionId(databaseId)) {
    throw createMcpError(
      NotionErrorCode.InvalidDatabaseId,
      `Invalid ${paramName}: must be a valid Notion UUID`
    );
  }
}

/**
 * Validate block ID and throw MCP error if invalid
 */
export function validateBlockIdOrThrow(blockId: string, paramName = 'blockId'): void {
  if (!blockId || typeof blockId !== 'string' || blockId.trim() === '') {
    throw createMcpError(
      NotionErrorCode.InvalidBlockId,
      `Invalid ${paramName}: must be a non-empty string`
    );
  }

  if (!isValidNotionId(blockId)) {
    throw createMcpError(
      NotionErrorCode.InvalidBlockId,
      `Invalid ${paramName}: must be a valid Notion UUID`
    );
  }
}

/**
 * Create parameter validation error
 */
export function createInvalidParamsError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InvalidParams, message, data);
}

/**
 * Create internal error
 */
export function createInternalError(message: string, data?: unknown): McpError {
  return createMcpError(ErrorCode.InternalError, message, data);
}
