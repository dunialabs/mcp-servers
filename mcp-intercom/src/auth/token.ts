/**
 * Intercom Authentication Module
 *
 * Authentication mode:
 * - OAuth Token (Production - Console/peta-core)
 *   - Provided by Console via accessToken environment variable
 *   - Token refresh is handled by Console platform
 *   - Used in production environments
 */

export interface IntercomCredentials {
  accessToken: string;
}

/**
 * Region endpoints for Intercom API
 */
const REGION_ENDPOINTS: Record<string, string> = {
  us: 'https://api.intercom.io',
  eu: 'https://api.eu.intercom.io',
  au: 'https://api.au.intercom.io',
};

/**
 * Get current Intercom credentials
 *
 * @returns Intercom OAuth credentials
 * @throws Error if access token is missing
 */
export function getCurrentCredentials(): IntercomCredentials {
  const accessToken = process.env.accessToken;

  if (!accessToken) {
    throw new Error(
      'Missing Intercom credentials. Please provide:\n\n' +
      'accessToken=your_oauth_token\n\n' +
      'For local development, obtain a token through Intercom OAuth flow.'
    );
  }

  return {
    accessToken,
  };
}

/**
 * Get Authorization header value for Intercom API requests
 *
 * @returns Authorization header value (Bearer token)
 */
export function getAuthHeader(): string {
  const { accessToken } = getCurrentCredentials();
  return `Bearer ${accessToken}`;
}

/**
 * Get Intercom API base URL based on configured region
 *
 * @returns Full API base URL (e.g., https://api.intercom.io)
 */
export function getBaseURL(): string {
  const region = (process.env.intercomRegion || 'us').toLowerCase();
  return REGION_ENDPOINTS[region] || REGION_ENDPOINTS.us;
}

