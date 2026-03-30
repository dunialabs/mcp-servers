/**
 * MCP Error Handling Utilities
 * Provides standardized error responses using MCP SDK error types
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';
import { TokenValidationError } from '../auth/token.js';

/**
 * Application-specific error codes (extends MCP standard error codes)
 */
export enum GoogleDriveErrorCode {
  ParseError = ErrorCode.ParseError,
  InvalidRequest = ErrorCode.InvalidRequest,
  MethodNotFound = ErrorCode.MethodNotFound,
  InvalidParams = ErrorCode.InvalidParams,
  InternalError = ErrorCode.InternalError,
  AuthenticationFailed = -32030,
  PermissionDenied = -32031,
  NotFound = -32032,
  RateLimited = -32034,
  ApiUnavailable = -32035,
  InvalidFileId = -32036,
  InvalidMimeType = -32037,
  FolderRequired = -32038,
  FileSizeTooLarge = -32039,
}

/**
 * Create a standardized MCP error
 */
export function createMcpError(
  code: number,
  message: string,
  data?: unknown
): McpError {
  return new McpError(code, message, data);
}

/**
 * Handle Google Drive API errors and convert to MCP errors
 */
export function handleGoogleDriveError(error: any, context: string): McpError {
  if (error instanceof McpError) {
    return error;
  }

  // Log the original error for debugging
  logger.error(`[GoogleDrive] ${context}:`, error);

  if (error instanceof TokenValidationError) {
    return createMcpError(
      GoogleDriveErrorCode.AuthenticationFailed,
      'Authentication failed or token expired. Reconnect Google Drive integration.',
      { context }
    );
  }

  // Extract error details from Google API error
  const statusCode = error?.code || error?.response?.status;
  const errorMessage = error?.message || 'Unknown error';
  const errorDetails = error?.errors || error?.response?.data;

  // Map Google API errors to MCP error codes
  switch (statusCode) {
    case 404:
      return createMcpError(
        GoogleDriveErrorCode.NotFound,
        `File not found: ${errorMessage}`,
        errorDetails
      );

    case 403:
      return createMcpError(
        GoogleDriveErrorCode.PermissionDenied,
        `Permission denied: ${errorMessage}`,
        errorDetails
      );

    case 401:
      return createMcpError(
        GoogleDriveErrorCode.AuthenticationFailed,
        `Authentication failed: ${errorMessage}`,
        errorDetails
      );

    case 400:
      return createMcpError(
        GoogleDriveErrorCode.InvalidParams,
        `Invalid request: ${errorMessage}`,
        errorDetails
      );

    case 413:
      return createMcpError(
        GoogleDriveErrorCode.FileSizeTooLarge,
        `File size too large: ${errorMessage}`,
        errorDetails
      );

    case 429:
      return createMcpError(
        GoogleDriveErrorCode.RateLimited,
        `Rate limit or quota exceeded: ${errorMessage}`,
        errorDetails
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return createMcpError(
        GoogleDriveErrorCode.ApiUnavailable,
        `Google Drive API error: ${errorMessage}`,
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
 * Validate file ID and throw MCP error if invalid
 */
export function validateFileIdOrThrow(fileId: string, paramName = 'fileId'): void {
  if (!fileId || typeof fileId !== 'string' || fileId.trim() === '') {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidFileId,
      `Invalid ${paramName}: must be a non-empty string`
    );
  }

  // Check for path traversal attempts
  if (fileId.includes('..') || fileId.includes('/') || fileId.includes('\\')) {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidFileId,
      `Invalid ${paramName}: contains forbidden characters (path traversal attempt detected)`
    );
  }
}

/**
 * Validate MIME type and throw MCP error if invalid
 */
export function validateMimeTypeOrThrow(mimeType: string): void {
  if (!mimeType || typeof mimeType !== 'string') {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidMimeType,
      'MIME type must be a non-empty string'
    );
  }

  if (mimeType.trim() === '') {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidMimeType,
      'MIME type must be a non-empty string'
    );
  }

  // Check for injection attempts
  if (/[<>"';()&|]/.test(mimeType)) {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidMimeType,
      'MIME type contains invalid characters'
    );
  }

  // Validate basic MIME type format
  if (!/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_+.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-^_+.]*$/.test(mimeType)) {
    const allowedFolderTypes = [
      'application/vnd.google-apps.folder',
      'application/vnd.google-apps.document',
      'application/vnd.google-apps.spreadsheet',
      'application/vnd.google-apps.presentation',
    ];

    if (!allowedFolderTypes.includes(mimeType)) {
      throw createMcpError(
        GoogleDriveErrorCode.InvalidMimeType,
        `Invalid MIME type format: ${mimeType}`
      );
    }
  }

  // Check length
  if (mimeType.length > 255) {
    throw createMcpError(
      GoogleDriveErrorCode.InvalidMimeType,
      'MIME type too long (max 255 characters)'
    );
  }
}

/**
 * Validate that a file is a folder and throw MCP error if not
 */
export function validateFolderOrThrow(mimeType: string, fileId: string): void {
  if (mimeType !== 'application/vnd.google-apps.folder') {
    throw createMcpError(
      GoogleDriveErrorCode.FolderRequired,
      `File ${fileId} is not a folder (mimeType: ${mimeType})`
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
