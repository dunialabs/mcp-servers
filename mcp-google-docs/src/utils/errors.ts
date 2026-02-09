/**
 * MCP Error Handling Utilities for Google Docs
 * Provides standardized error responses using MCP SDK error types
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * Application-specific error codes (extends MCP standard error codes)
 */
export enum GoogleDocsErrorCode {
  // MCP Standard Errors (from ErrorCode enum)
  ParseError = ErrorCode.ParseError,           // -32700: Invalid JSON
  InvalidRequest = ErrorCode.InvalidRequest,   // -32600: Invalid request
  MethodNotFound = ErrorCode.MethodNotFound,   // -32601: Method not found
  InvalidParams = ErrorCode.InvalidParams,     // -32602: Invalid parameters
  InternalError = ErrorCode.InternalError,     // -32603: Internal error

  // Google Docs specific errors (custom range: -32000 to -32099)
  DocumentNotFound = -32010,                   // Document not found
  PermissionDenied = -32011,                   // Permission denied
  QuotaExceeded = -32012,                      // API quota exceeded
  InvalidDocumentId = -32015,                  // Invalid document ID format
  AuthenticationFailed = -32018,               // Authentication failed
  TokenExpired = -32019,                       // Access token expired
  NetworkError = -32020,                       // Network/API communication error
  InvalidRange = -32021,                       // Invalid content range
  ContentTooLarge = -32022,                    // Content exceeds size limit
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
 * Handle Google Docs API errors and convert to MCP errors
 */
export function handleGoogleDocsError(error: any, context: string): McpError {
  // Log the original error for debugging
  logger.error(`[GoogleDocs] ${context}:`, error);

  // Extract error details from Google API error
  const statusCode = error?.code || error?.response?.status;
  const errorMessage = error?.message || 'Unknown error';
  const errorDetails = error?.errors || error?.response?.data;

  // Map Google API errors to MCP error codes
  switch (statusCode) {
    case 404:
      return createMcpError(
        GoogleDocsErrorCode.DocumentNotFound,
        `Document not found: ${errorMessage}`,
        errorDetails
      );

    case 403:
      return createMcpError(
        GoogleDocsErrorCode.PermissionDenied,
        `Permission denied: ${errorMessage}`,
        errorDetails
      );

    case 401:
      return createMcpError(
        GoogleDocsErrorCode.AuthenticationFailed,
        `Authentication failed: ${errorMessage}`,
        errorDetails
      );

    case 400:
      return createMcpError(
        GoogleDocsErrorCode.InvalidParams,
        `Invalid request: ${errorMessage}`,
        errorDetails
      );

    case 429:
      return createMcpError(
        GoogleDocsErrorCode.QuotaExceeded,
        `Rate limit or quota exceeded: ${errorMessage}`,
        errorDetails
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return createMcpError(
        GoogleDocsErrorCode.NetworkError,
        `Google Docs API error: ${errorMessage}`,
        errorDetails
      );

    default:
      return createMcpError(
        ErrorCode.InternalError,
        `${context}: ${errorMessage}`,
        { statusCode, ...errorDetails }
      );
  }
}

/**
 * Validate document ID and throw MCP error if invalid
 */
export function validateDocumentIdOrThrow(documentId: string, paramName = 'documentId'): void {
  if (!documentId || typeof documentId !== 'string' || documentId.trim() === '') {
    throw createMcpError(
      GoogleDocsErrorCode.InvalidDocumentId,
      `Invalid ${paramName}: must be a non-empty string`
    );
  }

  // Check for path traversal attempts
  if (documentId.includes('..') || documentId.includes('/') || documentId.includes('\\')) {
    throw createMcpError(
      GoogleDocsErrorCode.InvalidDocumentId,
      `Invalid ${paramName}: contains forbidden characters (path traversal attempt detected)`
    );
  }

  // Google Docs IDs: alphanumeric, hyphens, underscores (typically 44 chars)
  const docIdRegex = /^[a-zA-Z0-9_-]{10,100}$/;
  if (!docIdRegex.test(documentId)) {
    throw createMcpError(
      GoogleDocsErrorCode.InvalidDocumentId,
      `Invalid ${paramName} format: "${documentId}". ` +
      `Expected alphanumeric characters with hyphens/underscores (10-100 chars).`
    );
  }
}

/**
 * Validate content range index
 */
export function validateIndexOrThrow(index: number, paramName = 'index'): void {
  if (typeof index !== 'number' || !Number.isInteger(index) || index < 1) {
    throw createMcpError(
      GoogleDocsErrorCode.InvalidRange,
      `Invalid ${paramName}: must be a positive integer (1 or greater)`
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
