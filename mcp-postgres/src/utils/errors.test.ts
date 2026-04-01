import { describe, expect, it } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  PostgresErrorCode,
  createConnectionError,
  createQueryError,
  handleUnknownError,
} from './errors.js';

describe('postgres errors', () => {
  it('maps connection errors to api unavailable', () => {
    const error = createConnectionError('database is down');
    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(PostgresErrorCode.ApiUnavailable);
  });

  it('maps generic query errors to internal error', () => {
    const error = createQueryError('bad query');
    expect(error.code).toBe(ErrorCode.InternalError);
  });

  it('maps postgres table not found errors to not found', () => {
    const error = handleUnknownError(
      { code: '42P01', message: 'relation does not exist' },
      'executeQuery'
    );
    expect(error.code).toBe(PostgresErrorCode.TableNotFound);
  });

  it('maps postgres privilege errors to permission denied', () => {
    const error = handleUnknownError(
      { code: '42501', message: 'insufficient privilege' },
      'executeWrite'
    );
    expect(error.code).toBe(PostgresErrorCode.PermissionDenied);
  });
});
