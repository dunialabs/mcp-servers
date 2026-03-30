import { describe, expect, it } from 'vitest';
import { IntercomError, IntercomMcpErrorCode, toMcpError } from './errors.js';

describe('intercom error mapping', () => {
  it('maps 401 to AuthenticationFailed', () => {
    const error = new IntercomError('unauthorized', 401, 'unauthorized');
    const mcpError = toMcpError(error, 'test');
    expect(mcpError.code).toBe(IntercomMcpErrorCode.AuthenticationFailed);
  });

  it('maps 404 to NotFound', () => {
    const error = new IntercomError('not found', 404, 'not_found');
    const mcpError = toMcpError(error, 'test');
    expect(mcpError.code).toBe(IntercomMcpErrorCode.NotFound);
  });

  it('maps 429 to RateLimited', () => {
    const error = new IntercomError('rate limited', 429, 'rate_limit');
    const mcpError = toMcpError(error, 'test');
    expect(mcpError.code).toBe(IntercomMcpErrorCode.RateLimited);
  });
});
