import { describe, expect, it } from 'vitest';
import { McpError } from '@modelcontextprotocol/sdk/types.js';
import { TokenValidationError } from '../auth/token.js';
import { GoogleDocsErrorCode, handleGoogleDocsError } from './errors.js';

describe('handleGoogleDocsError', () => {
  it('maps token validation errors to authentication failed', () => {
    const result = handleGoogleDocsError(new TokenValidationError('Invalid accessToken format'), 'test');
    expect(result).toBeInstanceOf(McpError);
    expect(result.code).toBe(GoogleDocsErrorCode.AuthenticationFailed);
  });

  it('maps not found errors to document not found', () => {
    const result = handleGoogleDocsError({ code: 404, message: 'missing' }, 'test');
    expect(result.code).toBe(GoogleDocsErrorCode.DocumentNotFound);
  });

  it('maps rate limit errors to rate limited', () => {
    const result = handleGoogleDocsError({ code: 429, message: 'slow down' }, 'test');
    expect(result.code).toBe(GoogleDocsErrorCode.RateLimited);
  });
});
