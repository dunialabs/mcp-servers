/**
 * Token Authentication Module
 * Reads runtime access token from process environment.
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
  const rawToken = process.env.accessToken;

  if (!rawToken || typeof rawToken !== 'string' || rawToken.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const token = normalizeAccessToken(rawToken);

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError('Invalid accessToken format');
  }

  return token;
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 0;
}
