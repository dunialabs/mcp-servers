/**
 * Error handling utilities
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

export enum SkillsErrorCode {
  NotFound = -32032,
}

/**
 * Custom error for skill-related issues
 */
export class SkillError extends Error {
  constructor(message: string, public code: string = 'SKILL_ERROR') {
    super(message);
    this.name = 'SkillError';
  }
}

/**
 * Convert unknown error to MCP error
 */
export function toMcpError(error: unknown, context: string): McpError {
  if (error instanceof McpError) {
    return error;
  }

  const message = error instanceof Error ? error.message : String(error);

  return new McpError(
    ErrorCode.InternalError,
    `${context}: ${message}`
  );
}

/**
 * Handle unknown errors in tool execution
 */
export function handleToolError(error: unknown, toolName: string): never {
  if (error instanceof McpError) {
    throw error;
  }

  if (error instanceof SkillError) {
    const isNotFound =
      error.code === 'SKILL_NOT_FOUND' ||
      error.code === 'FILE_NOT_FOUND' ||
      error.code === 'DIRECTORY_NOT_FOUND';

    const isInvalidParams =
      error.code === 'INVALID_PATH' ||
      error.code === 'ACCESS_DENIED' ||
      error.code === 'UNSUPPORTED_FILE_TYPE' ||
      error.code === 'NOT_A_FILE' ||
      error.code === 'FILE_TOO_LARGE';

    throw new McpError(
      isNotFound
        ? SkillsErrorCode.NotFound
        : isInvalidParams
          ? ErrorCode.InvalidParams
          : ErrorCode.InternalError,
      `[${toolName}] ${error.message}`
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  throw new McpError(
    ErrorCode.InternalError,
    `[${toolName}] ${message}`
  );
}
