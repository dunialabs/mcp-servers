/**
 * Token Authentication Module
 * STDIO Mode: Token from environment variable (accessToken)
 *
 * Console passes the access token directly via environment variable.
 * The token can be updated in real-time via MCP notification without restarting the server.
 *
 * Token Update Flow:
 * 1. Initial: Console starts server with accessToken env var
 * 2. Runtime: Console sends notifications/token/update when token is refreshed
 * 3. server.ts updates process.env.accessToken
 * 4. This module reads the latest token on each call
 */

/**
 * Get current GitHub access token from environment variable
 *
 * This function reads from process.env.accessToken, which can be updated
 * in real-time by Console via MCP notifications (see server.ts).
 * Each call returns the latest token without requiring server restart.
 *
 * @returns Current GitHub access token
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
 * Validate GitHub token format
 *
 * GitHub token formats (as of 2025):
 * - Personal Access Token (classic): ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40+ chars)
 * - Fine-grained PAT: github_pat_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 * - OAuth access token: gho_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars)
 * - GitHub App token: ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx (40 chars)
 * - GitHub App installation token: ghs_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Note: GitHub tokens are case-sensitive and consist of a prefix followed by
 * an underscore and a base62-encoded string.
 */
export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // GitHub tokens are typically 40+ characters
  // Minimum length check (realistic minimum for GitHub tokens)
  if (token.length < 20 || token.length > 500) {
    return false;
  }

  // Check for printable ASCII characters only (security: prevent control characters)
  if (!/^[\x20-\x7E]+$/.test(token)) {
    return false;
  }

  // GitHub tokens typically contain only alphanumeric characters and underscores
  // This is a lenient check to allow for future token format changes
  if (!/^[a-zA-Z0-9_]+$/.test(token)) {
    return false;
  }

  return true;
}
