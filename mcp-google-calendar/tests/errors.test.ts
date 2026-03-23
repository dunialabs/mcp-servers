import { describe, expect, it } from 'vitest';
import { handleGoogleCalendarError } from '../src/utils/errors.js';

describe('google calendar error mapping', () => {
  it('maps 401 to AuthenticationFailed', () => {
    const error = handleGoogleCalendarError({ status: 401 }, 'test');
    expect(error.code).toBe(-32030);
  });

  it('maps 404 to NotFound', () => {
    const error = handleGoogleCalendarError({ status: 404 }, 'test');
    expect(error.code).toBe(-32032);
  });

  it('maps 429 to RateLimited', () => {
    const error = handleGoogleCalendarError({ status: 429 }, 'test');
    expect(error.code).toBe(-32034);
  });
});
