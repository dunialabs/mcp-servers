import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  TokenValidationError,
  normalizeAccessToken,
  validateTokenFormat,
  createStripeClient,
} from './stripe-client.js';

const ORIGINAL_ENV = { ...process.env };

describe('stripe-client auth helpers', () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  it('normalizes optional Bearer prefix', () => {
    expect(normalizeAccessToken('  Bearer sk_test_123  ')).toBe('sk_test_123');
  });

  it('validates supported key prefixes', () => {
    expect(validateTokenFormat('sk_test_123')).toBe(true);
    expect(validateTokenFormat('sk_live_123')).toBe(true);
    expect(validateTokenFormat('pk_test_123')).toBe(false);
  });

  it('throws TokenValidationError when key missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => createStripeClient()).toThrow(TokenValidationError);
  });
});
