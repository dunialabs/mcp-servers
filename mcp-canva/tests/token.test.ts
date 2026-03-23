import { afterEach, describe, expect, it } from 'vitest';
import {
  getCurrentCredentials,
  normalizeAccessToken,
  TokenValidationError,
} from '../src/auth/token.js';

const ORIGINAL_ACCESS_TOKEN = process.env.accessToken;

describe('canva token helpers', () => {
  afterEach(() => {
    if (ORIGINAL_ACCESS_TOKEN === undefined) {
      delete process.env.accessToken;
      return;
    }

    process.env.accessToken = ORIGINAL_ACCESS_TOKEN;
  });

  it('normalizes optional Bearer prefix and whitespace', () => {
    expect(normalizeAccessToken('  Bearer canva_token_example  ')).toBe('canva_token_example');
  });

  it('reads normalized access token from env', () => {
    process.env.accessToken = '  Bearer canva_token_example  ';
    expect(getCurrentCredentials().accessToken).toBe('canva_token_example');
  });

  it('throws TokenValidationError when accessToken is missing', () => {
    delete process.env.accessToken;
    expect(() => getCurrentCredentials()).toThrow(TokenValidationError);
  });
});
