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
 * @throws Error if token is not set or invalid
 */
export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token) {
    throw new Error('accessToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new Error('Invalid accessToken format');
  }

  return token;
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
