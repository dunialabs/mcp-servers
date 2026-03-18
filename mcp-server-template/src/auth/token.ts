/**
 * Token Management Module
 *
 * Handles API token retrieval and validation.
 * The token is read from process.env.accessToken and can be updated
 * at runtime via the notifications/token/update MCP notification.
 *
 * Usage:
 *   import { getCurrentToken, validateTokenFormat, TokenValidationError } from './auth/token.js';
 *
 * Delete this file if your server does not require OAuth/API token authentication.
 */

/**
 * Thrown when the token is missing or has an invalid format.
 * Caught by withRetry in the API utility to produce an AuthenticationFailed MCP error.
 */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/**
 * Validate token format.
 * Adjust the minimum length and any prefix checks to match your API's requirements.
 */
export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

/**
 * Get the current token from environment, stripping the "Bearer " prefix if present.
 * Throws TokenValidationError if the token is absent or invalid.
 */
export function getCurrentToken(): string {
  const raw = process.env.accessToken;

  if (!raw) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const token = raw.startsWith('Bearer ') ? raw.slice(7).trim() : raw.trim();

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError('Invalid accessToken format');
  }

  return token;
}
