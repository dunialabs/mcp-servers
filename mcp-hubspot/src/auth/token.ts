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

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const normalizedToken = normalizeAccessToken(token);
  if (normalizedToken.length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  if (!validateTokenFormat(normalizedToken)) {
    throw new TokenValidationError('Invalid accessToken format for HubSpot OAuth token');
  }

  return normalizedToken;
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && normalizeAccessToken(token).length >= 20;
}
