import { describe, expect, it } from 'vitest';
import { CanvaError, toMcpError } from '../src/utils/errors.js';

describe('canva error mapping', () => {
  it('maps 401 to AuthenticationFailed', () => {
    const error = toMcpError(new CanvaError('bad token', 401, 'AUTH'), 'test');
    expect(error.code).toBe(-32030);
  });

  it('maps 404 to NotFound', () => {
    const error = toMcpError(new CanvaError('missing', 404, 'NOT_FOUND'), 'test');
    expect(error.code).toBe(-32032);
  });

  it('maps 429 to RateLimited', () => {
    const error = toMcpError(new CanvaError('rate limited', 429, 'RATE_LIMIT'), 'test');
    expect(error.code).toBe(-32034);
  });
});
