import { afterEach, describe, expect, it } from 'vitest';
import { getAuthContext, normalizeAccessToken } from './token.js';

const originalAccessToken = process.env.accessToken;
const originalApiDomain = process.env.apiDomain;

afterEach(() => {
  process.env.accessToken = originalAccessToken;
  process.env.apiDomain = originalApiDomain;
});

describe('normalizeAccessToken', () => {
  it('strips optional Bearer prefix', () => {
    expect(normalizeAccessToken('Bearer abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(normalizeAccessToken('bearer abcdefghijklmnopqrstuvwxyz')).toBe('abcdefghijklmnopqrstuvwxyz');
  });
});

describe('getAuthContext', () => {
  it('returns normalized token from env', () => {
    process.env.accessToken = 'Bearer abcdefghijklmnopqrstuvwxyz';
    process.env.apiDomain = 'petaeco.pipedrive.com';

    const auth = getAuthContext();
    expect(auth.accessToken).toBe('abcdefghijklmnopqrstuvwxyz');
    expect(auth.apiDomain).toBe('https://petaeco.pipedrive.com');
  });
});
