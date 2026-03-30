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

export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

/**
 * Region endpoints for Intercom API
 */
const REGION_ENDPOINTS: Record<string, string> = {
  us: 'https://api.intercom.io',
  eu: 'https://api.eu.intercom.io',
  au: 'https://api.au.intercom.io',
};

export function normalizeAccessToken(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

export function validateTokenFormat(token: string): boolean {
  if (!token || typeof token !== 'string') {
    return false;
  }

  const normalized = normalizeAccessToken(token);

  if (normalized.length < 20 || normalized.length > 500) {
    return false;
  }

  if (!/^[\x20-\x7E]+$/.test(normalized)) {
    return false;
  }

  return true;
}

/**
 * Get current Intercom credentials
 *
 * @returns Intercom OAuth credentials
 * @throws Error if access token is missing
 */
export function getCurrentCredentials(): IntercomCredentials {
  const raw = process.env.accessToken;

  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const accessToken = normalizeAccessToken(raw);
  if (!validateTokenFormat(accessToken)) {
    throw new TokenValidationError('Invalid accessToken format');
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
