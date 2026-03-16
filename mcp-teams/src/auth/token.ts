export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 20;
}

export function getCurrentToken(): string {
  const rawToken = process.env.accessToken;

  if (!rawToken || rawToken.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const token = rawToken.startsWith('Bearer ') ? rawToken.slice(7).trim() : rawToken.trim();

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError('Invalid accessToken format');
  }

  return token;
}
