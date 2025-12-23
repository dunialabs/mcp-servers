/**
 * Error Handling Utilities for GitHub MCP Server
 *
 * Provides standardized error handling for GitHub API errors,
 * mapping them to MCP error codes with user-friendly messages.
 */

import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { logger } from './logger.js';

/**
 * GitHub API Error Response
 */
export interface GitHubErrorResponse {
  message: string;
  documentation_url?: string;
  status?: number;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
    message?: string;
  }>;
}

/**
 * Handle GitHub API errors and convert to MCP errors
 *
 * Maps GitHub HTTP status codes and error types to appropriate MCP error codes:
 * - 401: AuthenticationFailed - Invalid or expired token
 * - 403: PermissionDenied - Insufficient permissions
 * - 404: ResourceNotFound - Resource doesn't exist
 * - 422: InvalidParams - Validation failed
 * - 429: TooManyRequests - Rate limit exceeded
 * - 5xx: InternalError - GitHub server error
 *
 * @param error - Error from GitHub API or other source
 * @param context - Operation context for error message
 * @returns McpError with appropriate code and message
 */
export function handleGitHubError(error: any, context: string): McpError {
  // Extract error details
  const status = error.status || error.response?.status;
  const message = error.message || 'Unknown error';
  const githubMessage = error.response?.data?.message;
  const documentationUrl = error.response?.data?.documentation_url;

  // Log the error with context
  logger.error(`[${context}] GitHub API Error`, {
    status,
    message: githubMessage || message,
    context,
    documentationUrl,
  });

  // Map HTTP status to MCP error code
  switch (status) {
    case 401:
      return new McpError(
        ErrorCode.InvalidRequest,
        `Authentication failed: ${githubMessage || 'Invalid or expired access token'}. ` +
          `Please check your GitHub token.`,
        { status, context, documentationUrl }
      );

    case 403:
      // Check if it's a rate limit error
      if (githubMessage?.toLowerCase().includes('rate limit')) {
        return new McpError(
          ErrorCode.InvalidRequest,
          `GitHub API rate limit exceeded. ${githubMessage}. ` +
            `Please wait or use a token with higher rate limits.`,
          { status, context, documentationUrl }
        );
      }

      return new McpError(
        ErrorCode.InvalidRequest,
        `Permission denied: ${githubMessage || 'Insufficient permissions for this operation'}. ` +
          `Check if your token has the required scopes.`,
        { status, context, documentationUrl }
      );

    case 404:
      return new McpError(
        ErrorCode.InvalidRequest,
        `Resource not found: ${githubMessage || 'The requested resource does not exist or you don\'t have access to it'}.`,
        { status, context, documentationUrl }
      );

    case 422: {
      // Validation error - extract field-specific errors if available
      const errors = error.response?.data?.errors;
      let validationDetails = '';
      if (errors && Array.isArray(errors)) {
        validationDetails = errors
          .map((e: any) => `${e.field}: ${e.message || e.code}`)
          .join(', ');
      }

      return new McpError(
        ErrorCode.InvalidParams,
        `Validation failed: ${githubMessage || 'Invalid parameters'}. ${validationDetails}`,
        { status, context, errors, documentationUrl }
      );
    }

    case 429:
      return new McpError(
        ErrorCode.InvalidRequest,
        `Rate limit exceeded: ${githubMessage}. Please wait before retrying.`,
        { status, context, documentationUrl }
      );

    case 500:
    case 502:
    case 503:
    case 504:
      return new McpError(
        ErrorCode.InternalError,
        `GitHub server error (${status}): ${githubMessage || 'Service temporarily unavailable'}. ` +
          `Please try again later.`,
        { status, context, documentationUrl }
      );

    default:
      // Generic error for unknown status codes
      return new McpError(
        ErrorCode.InternalError,
        `GitHub API error: ${githubMessage || message}`,
        { status, context, documentationUrl }
      );
  }
}

/**
 * Validate GitHub repository identifier (owner/repo format)
 *
 * @param repo - Repository identifier in "owner/repo" format
 * @throws McpError if format is invalid
 */
export function validateRepositoryFormat(repo: string): void {
  if (!repo || typeof repo !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Repository identifier is required and must be a string'
    );
  }

  const parts = repo.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid repository format: "${repo}". Expected format: "owner/repo" (e.g., "octocat/Hello-World")`
    );
  }

  // Validate owner and repo names (GitHub rules)
  const validNamePattern = /^[a-zA-Z0-9_.-]+$/;
  if (!validNamePattern.test(parts[0]) || !validNamePattern.test(parts[1])) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid repository name: "${repo}". Owner and repository names can only contain alphanumeric characters, hyphens, underscores, and periods.`
    );
  }
}

/**
 * Validate GitHub issue or PR number
 *
 * @param number - Issue or PR number
 * @throws McpError if invalid
 */
export function validateIssueNumber(number: number): void {
  if (!Number.isInteger(number) || number < 1) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Invalid issue/PR number: ${number}. Must be a positive integer.`
    );
  }
}

/**
 * Validate GitHub username
 *
 * @param username - GitHub username
 * @throws McpError if invalid
 */
export function validateUsername(username: string): void {
  if (!username || typeof username !== 'string') {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Username is required and must be a string'
    );
  }

  // GitHub username rules: alphanumeric and hyphens, cannot start/end with hyphen, max 39 chars
  if (username.length > 39) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Username too long: "${username}". GitHub usernames cannot exceed 39 characters.`
    );
  }

  // Allow single character usernames
  if (username.length === 1) {
    if (!/^[a-zA-Z0-9]$/.test(username)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid username: "${username}". Username must be alphanumeric.`
      );
    }
  } else {
    // Multi-character usernames: alphanumeric, hyphens allowed in middle
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])$/.test(username)) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Invalid username: "${username}". Username can only contain alphanumeric characters and hyphens, and cannot start or end with a hyphen.`
      );
    }
  }
}

/**
 * Validate Git branch name
 *
 * @param branchName - Branch name
 * @throws McpError if invalid
 */
export function validateBranchName(branchName: string): void {
  if (!branchName || typeof branchName !== 'string') {
    throw new McpError(ErrorCode.InvalidParams, 'Branch name is required and must be a string');
  }

  const trimmed = branchName.trim();
  if (trimmed === '') {
    throw new McpError(ErrorCode.InvalidParams, 'Branch name cannot be empty');
  }

  // Git branch name rules
  if (trimmed.startsWith('/') || trimmed.endsWith('/')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Branch name cannot start or end with "/": "${branchName}"`
    );
  }

  if (trimmed.includes('..')) {
    throw new McpError(ErrorCode.InvalidParams, `Branch name cannot contain "..": "${branchName}"`);
  }

  if (/[\s~^:?*[\\\]]/.test(trimmed)) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Branch name contains invalid characters (space, ~, ^, :, ?, *, [, \\, ]): "${branchName}"`
    );
  }

  if (trimmed === '@' || trimmed.includes('@{')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Branch name cannot be "@" or contain "@{": "${branchName}"`
    );
  }

  if (trimmed.endsWith('.lock')) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Branch name cannot end with ".lock": "${branchName}"`
    );
  }

  if (trimmed.length > 255) {
    throw new McpError(
      ErrorCode.InvalidParams,
      `Branch name is too long: "${branchName}" (max 255 characters)`
    );
  }

  // Warn about potentially problematic branch names
  const protectedNames = ['HEAD', 'master', 'main'];
  if (protectedNames.includes(trimmed)) {
    logger.warn(`[validateBranchName] Operating on protected branch name: "${branchName}"`);
  }
}
