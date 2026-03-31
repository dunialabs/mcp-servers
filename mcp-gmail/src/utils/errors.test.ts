import { describe, expect, it } from 'vitest';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { TokenValidationError } from '../auth/token.js';
import { GmailErrorCode, handleGmailApiError } from './errors.js';

describe('handleGmailApiError', () => {
  it('maps token validation errors to authentication failures', () => {
    const error = handleGmailApiError(new TokenValidationError('bad token'), 'getMessage');
    expect(error.code).toBe(GmailErrorCode.AuthenticationFailed);
  });

  it('maps 404 to NotFound', () => {
    const error = handleGmailApiError({ code: 404, message: 'missing' }, 'getMessage');
    expect(error.code).toBe(GmailErrorCode.NotFound);
  });

  it('maps unknown errors to InternalError', () => {
    const error = handleGmailApiError({ message: 'boom' }, 'getMessage');
    expect(error.code).toBe(ErrorCode.InternalError);
  });
});
