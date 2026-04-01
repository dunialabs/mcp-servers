import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import {
  createConnectionError,
  createInvalidParamsError,
  createInternalError,
  createMcpError,
  createQueryError,
  handleUnknownError,
  MysqlErrorCode,
} from './errors.js';
import { logger } from './logger.js';

vi.mock('./logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('mysql errors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates MCP errors without extra wrapping', () => {
    const error = createMcpError(ErrorCode.InvalidParams, 'bad input');
    expect(error).toBeInstanceOf(McpError);
    expect(error.code).toBe(ErrorCode.InvalidParams);
  });

  it('creates invalid params errors', () => {
    const error = createInvalidParamsError('missing database');
    expect(error.code).toBe(ErrorCode.InvalidParams);
  });

  it('creates internal errors', () => {
    const error = createInternalError('unexpected');
    expect(error.code).toBe(ErrorCode.InternalError);
  });

  it('maps connection errors to api unavailable', () => {
    const error = createConnectionError('socket hang up');
    expect(error.code).toBe(MysqlErrorCode.ApiUnavailable);
    expect(error.message).toContain('Database connection failed');
  });

  it('maps generic query errors to internal error', () => {
    const error = createQueryError('syntax issue');
    expect(error.code).toBe(ErrorCode.InternalError);
  });

  it('returns existing MCP errors unchanged', () => {
    const original = createInvalidParamsError('already mapped');
    expect(handleUnknownError(original, 'mysqlExecuteQuery')).toBe(original);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('maps mysql permission errors', () => {
    const error = handleUnknownError(
      { errno: 1045, message: 'Access denied for user' },
      'connect'
    );
    expect(error.code).toBe(MysqlErrorCode.PermissionDenied);
  });

  it('maps mysql missing database errors to not found', () => {
    const error = handleUnknownError(
      { errno: 1049, message: "Unknown database 'app'" },
      'listTables'
    );
    expect(error.code).toBe(MysqlErrorCode.NotFound);
  });

  it('maps mysql missing table errors to not found', () => {
    const error = handleUnknownError(
      { errno: 1146, message: "Table 'app.users' doesn't exist" },
      'describeTable'
    );
    expect(error.code).toBe(MysqlErrorCode.NotFound);
  });

  it('maps mysql invalid query errors to invalid params', () => {
    const error = handleUnknownError(
      { errno: 1064, message: 'You have an error in your SQL syntax' },
      'mysqlExecuteQuery'
    );
    expect(error.code).toBe(ErrorCode.InvalidParams);
  });

  it('maps mysql timeout errors to api unavailable', () => {
    const error = handleUnknownError(
      { errno: 1205, message: 'Lock wait timeout exceeded' },
      'mysqlExecuteWrite'
    );
    expect(error.code).toBe(MysqlErrorCode.ApiUnavailable);
  });

  it('maps other mysql execution errors to internal error', () => {
    const error = handleUnknownError(
      { errno: 1062, message: 'Duplicate entry', sqlState: '23000' },
      'mysqlExecuteWrite'
    );
    expect(error.code).toBe(ErrorCode.InternalError);
  });

  it('logs non-MCP errors once at the handler layer', () => {
    handleUnknownError(new Error('boom'), 'mysqlExecuteQuery');
    expect(logger.error).toHaveBeenCalledWith('[mysqlExecuteQuery] Error:', 'boom');
  });

  it('uses repository-standard custom codes', () => {
    expect(MysqlErrorCode.PermissionDenied).toBe(-32031);
    expect(MysqlErrorCode.NotFound).toBe(-32032);
    expect(MysqlErrorCode.ApiUnavailable).toBe(-32035);
  });
});
