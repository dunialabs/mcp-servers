/**
 * Token Authentication Module
 * STDIO Mode: Token from environment variable (notionToken)
 *
 * PETA Core passes the Notion token directly via environment variable.
 * The token can be updated in real-time via MCP notification without restarting the server.
 *
 * Token Update Flow:
 * 1. Initial: peta-core starts server with notionToken env var
 * 2. Runtime: peta-core sends notifications/token/update when token is refreshed
 * 3. server.ts updates process.env.notionToken
 * 4. This module reads the latest token on each call
 */

/**
 * Get current Notion token from environment variable
 *
 * This function reads from process.env.notionToken, which can be updated
 * in real-time by peta-core via MCP notifications (see server.ts).
 * Each call returns the latest token without requiring server restart.
 *
 * @returns Current Notion token
 * @throws Error if token is not set or invalid
 */
export function getCurrentToken(): string {
  const token = process.env.notionToken;

  if (!token) {
    throw new Error('notionToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new Error('Invalid notionToken format');
  }

  return token;
}

/**
 * Validate token format (basic check)
 *
 * Note: Notion officially advises against strict token format validation
 * as the format may change over time. This performs minimal validation only.
 * Current known formats: secret_* (legacy) and ntn_* (new format since Sep 2024)
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // Validate length bounds (Notion tokens are typically 40+ characters)
  if (token.length < 20 || token.length > 500) {
    return false;
  }

  // Check for printable ASCII characters only (security: prevent control characters)
  if (!/^[\x20-\x7E]+$/.test(token)) {
    return false;
  }

  return true;
}
