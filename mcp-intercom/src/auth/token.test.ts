import { afterEach, describe, expect, it } from 'vitest';
import {
  TokenValidationError,
  getCurrentCredentials,
  normalizeAccessToken,
  validateTokenFormat,
} from './token.js';

describe('intercom token utils', () => {
  afterEach(() => {
    delete process.env.accessToken;
  });

  it('normalizes optional Bearer prefix and whitespace', () => {
    expect(normalizeAccessToken('  Bearer abc123tokenvalue  ')).toBe('abc123tokenvalue');
  });

  it('validates reasonable token formats', () => {
    expect(validateTokenFormat('abcdefghijklmnopqrstuvxyz1234567890TOKEN')).toBe(true);
    expect(validateTokenFormat('')).toBe(false);
    expect(validateTokenFormat('short')).toBe(false);
  });

  it('returns normalized current credentials', () => {
    process.env.accessToken = '  Bearer abcdefghijklmnopqrstuvwxyz1234567890TOKEN  ';
    expect(getCurrentCredentials().accessToken).toBe('abcdefghijklmnopqrstuvwxyz1234567890TOKEN');
  });

  it('throws TokenValidationError when access token is missing', () => {
    expect(() => getCurrentCredentials()).toThrow(TokenValidationError);
  });
});
