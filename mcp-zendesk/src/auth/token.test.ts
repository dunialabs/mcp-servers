import { afterEach, describe, expect, it } from 'vitest';
import {
  AuthMode,
  getCurrentCredentials,
  normalizeAccessToken,
  TokenValidationError,
  validateTokenFormat,
} from './token.js';

describe('zendesk auth token', () => {
  const originalEnv = {
    accessToken: process.env.accessToken,
    zendeskSubdomain: process.env.zendeskSubdomain,
    zendeskEmail: process.env.zendeskEmail,
    zendeskApiToken: process.env.zendeskApiToken,
  };

  afterEach(() => {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('normalizes bearer token', () => {
    expect(normalizeAccessToken(' Bearer token-value ')).toBe('token-value');
  });

  it('returns oauth credentials with normalized token', () => {
    process.env.zendeskSubdomain = 'mycompany';
    process.env.accessToken = 'Bearer oauth-token';

    const creds = getCurrentCredentials();
    expect(creds.mode).toBe(AuthMode.OAUTH);
    expect(creds.accessToken).toBe('oauth-token');
  });

  it('returns api token credentials when oauth token is absent', () => {
    process.env.zendeskSubdomain = 'mycompany';
    process.env.zendeskEmail = 'admin@example.com';
    process.env.zendeskApiToken = 'api-token';

    const creds = getCurrentCredentials();
    expect(creds.mode).toBe(AuthMode.API_TOKEN);
    expect(creds.email).toBe('admin@example.com');
  });

  it('throws token validation error when subdomain is missing', () => {
    delete process.env.zendeskSubdomain;
    expect(() => getCurrentCredentials()).toThrow(TokenValidationError);
  });

  it('rejects empty normalized token', () => {
    expect(validateTokenFormat('')).toBe(false);
  });
});
