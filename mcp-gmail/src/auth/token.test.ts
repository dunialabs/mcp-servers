import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TokenValidationError,
  getCurrentToken,
  normalizeAccessToken,
  validateTokenFormat,
} from './token.js';

const ORIGINAL_ENV = { ...process.env };

describe('gmail token helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes optional Bearer prefix', () => {
    expect(normalizeAccessToken('  Bearer ya29.test  ')).toBe('ya29.test');
  });

  it('validates non-empty token strings', () => {
    expect(validateTokenFormat('ya29.test')).toBe(true);
  });

  it('throws when token missing', () => {
    delete process.env.accessToken;
    expect(() => getCurrentToken()).toThrow(TokenValidationError);
  });
});
