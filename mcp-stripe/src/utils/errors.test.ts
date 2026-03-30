import { describe, expect, it } from 'vitest';
import Stripe from 'stripe';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TokenValidationError } from '../auth/stripe-client.js';
import { handleStripeError, StripeMcpErrorCode } from './errors.js';

function createStripeError(
  type: 'StripeRateLimitError' | 'StripeInvalidRequestError',
  overrides: Partial<Stripe.StripeRawError> = {}
): Stripe.errors.StripeError {
  const error = Object.create(Stripe.errors.StripeError.prototype) as Stripe.errors.StripeError;
  Object.assign(error, {
    name: 'StripeError',
    message: 'boom',
    type: type as Stripe.errors.StripeError['type'],
    ...overrides,
  });
  return error;
}

describe('handleStripeError', () => {
  it('maps token validation errors to authentication failures', () => {
    const error = handleStripeError(new TokenValidationError('bad key'));
    expect(error.code).toBe(StripeMcpErrorCode.AuthenticationFailed);
  });

  it('maps rate limit errors to RateLimited', () => {
    const error = handleStripeError(createStripeError('StripeRateLimitError'));
    expect(error.code).toBe(StripeMcpErrorCode.RateLimited);
  });

  it('maps invalid request errors to InvalidParams', () => {
    const error = handleStripeError(createStripeError('StripeInvalidRequestError'));
    expect(error.code).toBe(ErrorCode.InvalidParams);
  });
});
