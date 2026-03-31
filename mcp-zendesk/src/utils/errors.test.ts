import { describe, expect, it } from 'vitest';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { TokenValidationError } from '../auth/token.js';
import { toMcpError, ZendeskError, ZendeskErrorCode } from './errors.js';

describe('toMcpError', () => {
  it('maps token validation errors to authentication failed', () => {
    const result = toMcpError(new TokenValidationError('Invalid access token'), 'test');
    expect(result).toBeInstanceOf(McpError);
    expect(result.code).toBe(ZendeskErrorCode.AuthenticationFailed);
  });

  it('maps 404 errors to not found', () => {
    const result = toMcpError(new ZendeskError('Missing', 404, 'HTTP_404'), 'test');
    expect(result.code).toBe(ZendeskErrorCode.NotFound);
  });

  it('maps 429 errors to rate limited', () => {
    const result = toMcpError(new ZendeskError('Slow down', 429, 'HTTP_429'), 'test');
    expect(result.code).toBe(ZendeskErrorCode.RateLimited);
  });
});
