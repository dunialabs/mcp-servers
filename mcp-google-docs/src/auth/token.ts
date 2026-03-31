/**
 * Token Authentication Module
 * STDIO Mode: Token from environment variable (accessToken)
 *
 * PETA Core passes the access token directly via environment variable.
 * The token can be updated in real-time via MCP notification without restarting the server.
 *
 * Token Update Flow:
 * 1. Initial: peta-core starts server with accessToken env var
 * 2. Runtime: peta-core sends notifications/token/update when token is refreshed
 * 3. server.ts updates process.env.accessToken
 * 4. This module reads the latest token on each call
 */

/**
 * Get current access token from environment variable
 *
 * This function reads from process.env.accessToken, which can be updated
 * in real-time by peta-core via MCP notifications (see server.ts).
 * Each call returns the latest token without requiring server restart.
 *
 * @returns Current access token
 * @throws TokenValidationError if token is not set or invalid
 */
export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function normalizeAccessToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const normalizedToken = normalizeAccessToken(token);

  if (!validateTokenFormat(normalizedToken)) {
    throw new TokenValidationError('Invalid accessToken format');
  }

  return normalizedToken;
}

/**
 * Validate token format (basic check)
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Google OAuth 2.0 access tokens typically start with 'ya29.'
  // But we'll accept any non-empty string for flexibility
  return token.length > 0;
}
