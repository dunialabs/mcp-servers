/**
 * Token Authentication Module
 * Reads runtime access token from process environment.
 */

export function getCurrentToken(): string {
  const token = process.env.accessToken;

  if (!token) {
    throw new Error('accessToken environment variable not set');
  }

  if (!validateTokenFormat(token)) {
    throw new Error('Invalid accessToken format');
  }

  return token;
}

export function validateTokenFormat(token: string): boolean {
  return typeof token === 'string' && token.trim().length > 0;
}
