/**
 * Error handling utilities
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';

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
    throw new McpError(
      ErrorCode.InvalidRequest,
      `[${toolName}] ${error.message}`
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  throw new McpError(
    ErrorCode.InternalError,
    `[${toolName}] ${message}`
  );
}
