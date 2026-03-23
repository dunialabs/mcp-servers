import { describe, expect, it } from 'vitest';
import { handleFigmaApiError } from '../src/utils/errors.js';

describe('handleFigmaApiError', () => {
  it('maps 401 to AuthenticationFailed', () => {
    const error = handleFigmaApiError({ status: 401, details: { reason: 'expired' } }, 'test');
    expect(error.code).toBe(-32030);
  });

  it('maps 404 to NotFound', () => {
    const error = handleFigmaApiError({ status: 404 }, 'test');
    expect(error.code).toBe(-32032);
  });

  it('maps 429 to RateLimited', () => {
    const error = handleFigmaApiError({ status: 429 }, 'test');
    expect(error.code).toBe(-32034);
  });

  it('maps 500 to ApiUnavailable', () => {
    const error = handleFigmaApiError({ status: 500 }, 'test');
    expect(error.code).toBe(-32035);
  });
});
