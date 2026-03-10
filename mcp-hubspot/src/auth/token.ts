export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    throw new TokenValidationError('accessToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new TokenValidationError('Invalid accessToken format for HubSpot OAuth token');
  }

  return token.trim();
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length >= 20;
}
