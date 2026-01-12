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

/**
 * Get current Canva credentials
 *
 * @returns Canva OAuth credentials
 * @throws Error if access token is missing
 */
export function getCurrentCredentials(): CanvaCredentials {
  const accessToken = process.env.accessToken;

  if (!accessToken) {
    throw new Error(
      'Missing Canva credentials. Please provide:\n\n' +
      'accessToken=your_oauth_token\n\n' +
      'For local development, see local-docs/canva-oauth-integration.md for ' +
      'instructions on how to obtain a test token.'
    );
  }

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
