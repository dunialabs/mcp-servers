import { afterEach, describe, expect, it } from 'vitest';
import { getCurrentToken, normalizeAccessToken, TokenValidationError, validateTokenFormat } from './token.js';

describe('token auth', () => {
  const originalToken = process.env.accessToken;

  afterEach(() => {
    if (originalToken === undefined) {
      delete process.env.accessToken;
    } else {
      process.env.accessToken = originalToken;
    }
  });

  it('normalizes bearer prefix and whitespace', () => {
    expect(normalizeAccessToken('  Bearer ya29.test  ')).toBe('ya29.test');
  });

  it('returns normalized token from env', () => {
    process.env.accessToken = 'Bearer ya29.test';
    expect(getCurrentToken()).toBe('ya29.test');
  });

  it('throws TokenValidationError when token is missing', () => {
    delete process.env.accessToken;
    expect(() => getCurrentToken()).toThrow(TokenValidationError);
  });

  it('rejects empty normalized token', () => {
    expect(validateTokenFormat('')).toBe(false);
  });
});
