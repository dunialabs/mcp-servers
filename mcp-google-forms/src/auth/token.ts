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
  const token = process.env.accessToken;

  if (!token) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  const normalized = token.startsWith('Bearer ') ? token.slice(7).trim() : token.trim();

  if (!validateTokenFormat(normalized)) {
    throw new TokenValidationError('Invalid accessToken format');
  }

  return normalized;
}
