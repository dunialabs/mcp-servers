import { describe, expect, it } from 'vitest';
import { TokenValidationError } from '../src/auth/token.js';
import { withBraveRetry } from '../src/utils/brave-api.js';

describe('withBraveRetry', () => {
  it('retries transient errors and eventually succeeds', async () => {
    let attempts = 0;

    const result = await withBraveRetry(
      async () => {
        attempts += 1;
        if (attempts < 2) {
          throw { status: 500, message: 'temporary failure' };
        }
        return 'ok';
      },
      'retrySuccess',
      2
    );

    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  });

  it('maps token validation errors to AuthenticationFailed', async () => {
    await expect(
      withBraveRetry(async () => {
        throw new TokenValidationError('invalid token');
      }, 'authFail', 1)
    ).rejects.toMatchObject({ code: -32030 });
  });

  it('maps 404 errors to NotFound', async () => {
    await expect(
      withBraveRetry(async () => {
        throw { status: 404, message: 'not found' };
      }, 'notFound', 1)
    ).rejects.toMatchObject({ code: -32032 });
  });

  it('maps 429 errors to RateLimited after retries are exhausted', async () => {
    let attempts = 0;

    await expect(
      withBraveRetry(async () => {
        attempts += 1;
        throw { status: 429, message: 'rate limited', retryAfterSeconds: 0 };
      }, 'rateLimit', 2)
    ).rejects.toMatchObject({ code: -32034 });

    expect(attempts).toBe(2);
  });
});
