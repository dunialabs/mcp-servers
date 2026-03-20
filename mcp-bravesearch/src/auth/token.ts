export class TokenValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenValidationError';
  }
}

export function normalizeApiKey(token: string): string {
  return token.trim().replace(/^Bearer\s+/i, '').trim();
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && normalizeApiKey(token).length >= 20;
}

export function getCurrentToken(): string {
  const raw = process.env.BRAVE_API_KEY;

  if (!raw || typeof raw !== 'string' || raw.trim().length === 0) {
    throw new TokenValidationError('BRAVE_API_KEY environment variable not set');
  }

  const normalized = normalizeApiKey(raw);
  if (!validateTokenFormat(normalized)) {
    throw new TokenValidationError('Invalid BRAVE_API_KEY format');
  }

  return normalized;
}
