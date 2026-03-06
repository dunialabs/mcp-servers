export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError(
      'Invalid accessToken format: expected Slack user token (xoxp-...)'
    );
  }

  return token;
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.startsWith('xoxp-') && token.trim().length > 10;
}
