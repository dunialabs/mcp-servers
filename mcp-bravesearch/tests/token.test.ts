import { afterEach, describe, expect, it } from 'vitest';
import { getCurrentToken, normalizeApiKey, validateTokenFormat } from '../src/auth/token.js';

const originalBraveApiKey = process.env.BRAVE_API_KEY;

afterEach(() => {
  process.env.BRAVE_API_KEY = originalBraveApiKey;
});

describe('token auth', () => {
  it('normalizes Bearer prefix', () => {
    expect(normalizeApiKey('Bearer abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrstuvwxyz');
  });

  it('validates normalized token format', () => {
    expect(validateTokenFormat('Bearer abcdefghijklmnopqrstuvwxyz')).toBe(true);
    expect(validateTokenFormat('short-token')).toBe(false);
  });

  it('reads BRAVE_API_KEY', () => {
    process.env.BRAVE_API_KEY = 'Bearer brave_api_key_abcdefghijklmnopqrstuvwxyz';
    expect(getCurrentToken()).toBe('brave_api_key_abcdefghijklmnopqrstuvwxyz');
  });

  it('throws when no token is configured', () => {
    delete process.env.BRAVE_API_KEY;
    expect(() => getCurrentToken()).toThrow('BRAVE_API_KEY environment variable not set');
  });
});
