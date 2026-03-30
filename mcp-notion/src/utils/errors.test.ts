import { describe, expect, it } from 'vitest';
import { TokenValidationError } from '../auth/token.js';
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { handleNotionError, NotionErrorCode } from './errors.js';

describe('handleNotionError', () => {
  it('maps token validation errors to authentication failures', () => {
    const error = handleNotionError(new TokenValidationError('bad token'), 'getPage');
    expect(error.code).toBe(NotionErrorCode.AuthenticationFailed);
  });

  it('maps 404 to NotFound', () => {
    const error = handleNotionError({ status: 404, message: 'missing' }, 'getPage');
    expect(error.code).toBe(NotionErrorCode.NotFound);
  });

  it('maps 400 to InvalidParams', () => {
    const error = handleNotionError({ status: 400, message: 'bad request' }, 'queryDatabase');
    expect(error.code).toBe(ErrorCode.InvalidParams);
  });
});
