import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  createMcpError,
  createInvalidParamsError,
  createInternalError,
  createConnectionError,
  createQueryError,
  createPermissionError,
  handleUnknownError,
  PostgresErrorCode,
} from '../../../src/utils/errors.js';
import { logger } from '../../../src/utils/logger.js';

// Mock logger to prevent console output during tests
vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

describe('Error Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMcpError', () => {
    it('should create MCP error with correct code and message', () => {
      const error = createMcpError(-32602, 'Invalid params');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(-32602);
      expect(error.message).toContain('Invalid params');
    });

    it('should include additional data when provided', () => {
      const data = { field: 'schema', value: null };
      const error = createMcpError(-32602, 'Missing field', data);

      expect(error.code).toBe(-32602);
      expect(error.message).toContain('Missing field');
      // McpError stores data in a private field, so we check via JSON
      expect(JSON.stringify(error)).toContain('schema');
    });

    it('should call logger.error', () => {
      createMcpError(-32602, 'Test error');
      expect(logger.error).toHaveBeenCalledWith(
        '[McpError] Code: -32602, Message: Test error',
        undefined
      );
    });
  });

  describe('createInvalidParamsError', () => {
    it('should create invalid params error with correct code', () => {
      const error = createInvalidParamsError('Missing schema parameter');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(ErrorCode.InvalidParams); // -32602
      expect(error.message).toContain('Missing schema parameter');
    });

    it('should include data when provided', () => {
      const data = { param: 'schema' };
      const error = createInvalidParamsError('Invalid parameter', data);

      expect(error.code).toBe(ErrorCode.InvalidParams);
      expect(error.message).toContain('Invalid parameter');
    });
  });

  describe('createInternalError', () => {
    it('should create internal error with correct code', () => {
      const error = createInternalError('Unexpected error occurred');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(ErrorCode.InternalError); // -32603
      expect(error.message).toContain('Unexpected error occurred');
    });
  });

  describe('createConnectionError', () => {
    it('should create connection error with custom code', () => {
      const error = createConnectionError('Connection timeout');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(PostgresErrorCode.DatabaseConnectionFailed); // -32010
      expect(error.message).toContain('Database connection failed');
      expect(error.message).toContain('Connection timeout');
    });
  });

  describe('createQueryError', () => {
    it('should create query error with custom code', () => {
      const error = createQueryError('Syntax error in SQL');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(PostgresErrorCode.QueryExecutionFailed); // -32011
      expect(error.message).toContain('Query execution failed');
      expect(error.message).toContain('Syntax error in SQL');
    });

    it('should include query details in data', () => {
      const data = { query: 'SELECT * FROM invalid' };
      const error = createQueryError('Table not found', data);

      expect(error.code).toBe(PostgresErrorCode.QueryExecutionFailed);
      expect(error.message).toContain('Table not found');
    });
  });

  describe('createPermissionError', () => {
    it('should create permission error', () => {
      const error = createPermissionError('Write operations not allowed');

      expect(error).toBeInstanceOf(McpError);
      expect(error.code).toBe(PostgresErrorCode.PermissionDenied); // -32014
      expect(error.message).toContain('Permission denied');
      expect(error.message).toContain('Write operations not allowed');
      expect(error.message).toContain('readonly mode');
    });
  });

  describe('handleUnknownError', () => {
    it('should return McpError if error is already McpError', () => {
      const originalError = createInvalidParamsError('Original error');
      const result = handleUnknownError(originalError, 'test context');

      expect(result).toBe(originalError);
      expect(result.code).toBe(ErrorCode.InvalidParams);
    });

    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');
      const result = handleUnknownError(error, 'executeQuery tool');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toContain('executeQuery tool');
      expect(result.message).toContain('Something went wrong');
    });

    it('should handle string errors', () => {
      const error = 'Plain string error';
      const result = handleUnknownError(error, 'test context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(ErrorCode.InternalError);
      expect(result.message).toContain('Plain string error');
    });

    it('should handle PostgreSQL undefined_table error (42P01)', () => {
      const pgError = {
        code: '42P01',
        message: 'relation "users" does not exist',
        detail: 'Table not found',
        hint: 'Check table name',
      };
      const result = handleUnknownError(pgError, 'query context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.TableNotFound);
      expect(result.message).toContain('Table not found');
      expect(result.message).toContain('relation "users" does not exist');
    });

    it('should handle PostgreSQL insufficient_privilege error (42501)', () => {
      const pgError = {
        code: '42501',
        message: 'permission denied for table users',
        detail: 'User lacks privileges',
      };
      const result = handleUnknownError(pgError, 'query context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.PermissionDenied);
      expect(result.message).toContain('Permission denied');
    });

    it('should handle PostgreSQL query_canceled error (57014)', () => {
      const pgError = {
        code: '57014',
        message: 'canceling statement due to statement timeout',
        detail: 'Query took too long',
      };
      const result = handleUnknownError(pgError, 'query context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.QueryTimeout);
      expect(result.message).toContain('Query timeout');
    });

    it('should handle PostgreSQL unique_violation error (23505)', () => {
      const pgError = {
        code: '23505',
        message: 'duplicate key value violates unique constraint',
        constraint: 'users_email_key',
        detail: 'Key (email)=(test@example.com) already exists',
      };
      const result = handleUnknownError(pgError, 'insert context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.QueryExecutionFailed);
      expect(result.message).toContain('Unique constraint violation');
    });

    it('should handle PostgreSQL foreign_key_violation error (23503)', () => {
      const pgError = {
        code: '23503',
        message: 'insert or update on table violates foreign key constraint',
        constraint: 'fk_user_id',
        detail: 'Key is not present in referenced table',
      };
      const result = handleUnknownError(pgError, 'insert context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.QueryExecutionFailed);
      expect(result.message).toContain('Foreign key constraint violation');
    });

    it('should handle PostgreSQL not_null_violation error (23502)', () => {
      const pgError = {
        code: '23502',
        message: 'null value in column "name" violates not-null constraint',
        column: 'name',
        detail: 'Column cannot be null',
      };
      const result = handleUnknownError(pgError, 'insert context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.QueryExecutionFailed);
      expect(result.message).toContain('Not null constraint violation');
    });

    it('should handle unknown PostgreSQL errors', () => {
      const pgError = {
        code: '99999',
        message: 'Unknown database error',
        detail: 'Some detail',
        hint: 'Some hint',
      };
      const result = handleUnknownError(pgError, 'query context');

      expect(result).toBeInstanceOf(McpError);
      expect(result.code).toBe(PostgresErrorCode.QueryExecutionFailed);
      expect(result.message).toContain('Unknown database error');
    });

    it('should log errors via logger', () => {
      const error = new Error('Test error');
      handleUnknownError(error, 'test context');

      expect(logger.error).toHaveBeenCalledWith('[test context] Error:', 'Test error');
    });
  });

  describe('PostgresErrorCode enum', () => {
    it('should have correct standard error codes', () => {
      expect(PostgresErrorCode.ParseError).toBe(ErrorCode.ParseError);
      expect(PostgresErrorCode.InvalidRequest).toBe(ErrorCode.InvalidRequest);
      expect(PostgresErrorCode.MethodNotFound).toBe(ErrorCode.MethodNotFound);
      expect(PostgresErrorCode.InvalidParams).toBe(ErrorCode.InvalidParams);
      expect(PostgresErrorCode.InternalError).toBe(ErrorCode.InternalError);
    });

    it('should have correct custom error codes in -32010 to -32099 range', () => {
      expect(PostgresErrorCode.DatabaseConnectionFailed).toBe(-32010);
      expect(PostgresErrorCode.QueryExecutionFailed).toBe(-32011);
      expect(PostgresErrorCode.TransactionFailed).toBe(-32012);
      expect(PostgresErrorCode.InvalidQuery).toBe(-32013);
      expect(PostgresErrorCode.PermissionDenied).toBe(-32014);
      expect(PostgresErrorCode.TableNotFound).toBe(-32015);
      expect(PostgresErrorCode.QueryTimeout).toBe(-32016);
    });
  });
});
