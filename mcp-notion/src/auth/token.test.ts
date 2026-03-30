import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  TokenValidationError,
  getCurrentToken,
  normalizeAccessToken,
  validateTokenFormat,
} from './token.js';

const ORIGINAL_ENV = { ...process.env };

describe('notion token helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes optional Bearer prefix', () => {
    expect(normalizeAccessToken('  Bearer ntn_123  ')).toBe('ntn_123');
  });

  it('accepts printable notion tokens', () => {
    expect(validateTokenFormat('ntn_abcdefghijklmnopqrstuvwxyz123456')).toBe(true);
  });

  it('throws when token missing', () => {
    delete process.env.notionToken;
    delete process.env.accessToken;
    expect(() => getCurrentToken()).toThrow(TokenValidationError);
  });
});
