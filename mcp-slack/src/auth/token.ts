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
    throw new TokenValidationError(
      'Invalid accessToken format: expected Slack user token (xoxp-...)'
    );
  }

  return normalizedToken;
}

export function validateTokenFormat(token: string): boolean {
  const normalizedToken = normalizeAccessToken(token);
  return typeof token === 'string' && normalizedToken.startsWith('xoxp-') && normalizedToken.length > 10;
}
