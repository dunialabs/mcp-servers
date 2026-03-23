import { afterEach, describe, expect, it } from 'vitest';
import {
  getCurrentToken,
  normalizeAccessToken,
  TokenValidationError,
  validateTokenFormat,
} from '../src/auth/token.js';

const ORIGINAL_ACCESS_TOKEN = process.env.accessToken;

describe('token auth helpers', () => {
  afterEach(() => {
    if (ORIGINAL_ACCESS_TOKEN === undefined) {
      delete process.env.accessToken;
      return;
    }

    process.env.accessToken = ORIGINAL_ACCESS_TOKEN;
  });

  it('normalizes optional Bearer prefix and whitespace', () => {
    expect(normalizeAccessToken('  Bearer figd_example_token  ')).toBe('figd_example_token');
  });

  it('reads normalized accessToken from env', () => {
    process.env.accessToken = '  Bearer figd_example_token  ';
    expect(getCurrentToken()).toBe('figd_example_token');
  });

  it('throws TokenValidationError when accessToken is missing', () => {
    delete process.env.accessToken;
    expect(() => getCurrentToken()).toThrow(TokenValidationError);
  });

  it('rejects blank tokens', () => {
    expect(validateTokenFormat('   ')).toBe(false);
  });
});
