/**
 * Canva Authentication Module
 *
 * Authentication mode:
 * - OAuth Token (Production - Console/peta-core)
 *   - Provided by Console via accessToken environment variable
 *   - Token refresh is handled by Console platform
 *   - Used in production environments
 */

export interface CanvaCredentials {
  accessToken: string;
}

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function normalizeAccessToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

/**
 * Get current Canva credentials
 *
 * @returns Canva OAuth credentials
 * @throws TokenValidationError if access token is missing or invalid
 */
export function getCurrentCredentials(): CanvaCredentials {
  const rawToken = process.env.accessToken;

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    throw new TokenValidationError(
      'Missing Canva credentials. Please provide:\n\n' +
      'accessToken=your_oauth_token\n\n' +
      'For local development, see local-docs/canva-oauth-integration.md for ' +
      'instructions on how to obtain a test token.'
    );
  }

  const accessToken = normalizeAccessToken(rawToken);

  return {
    accessToken,
  };
}

/**
 * Get Authorization header value for Canva API requests
 *
 * @returns Authorization header value (Bearer token)
 */
export function getAuthHeader(): string {
  const { accessToken } = getCurrentCredentials();
  return `Bearer ${accessToken}`;
}

/**
 * Get Canva API base URL
 *
 * @returns Full API base URL (https://api.canva.com/rest/v1)
 */
export function getBaseURL(): string {
  return 'https://api.canva.com/rest/v1';
}
