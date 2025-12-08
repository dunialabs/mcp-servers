import { describe, it, expect } from 'vitest';
import {
  validateFileIdOrThrow,
  validateMimeTypeOrThrow,
  createMcpError,
  GoogleDriveErrorCode
} from '../errors.js';

describe('errors.ts', () => {
  describe('validateFileIdOrThrow', () => {
    it('should accept valid file IDs', () => {
      expect(() => validateFileIdOrThrow('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs')).not.toThrow();
      expect(() => validateFileIdOrThrow('root')).not.toThrow();
      expect(() => validateFileIdOrThrow('abc123_-def')).not.toThrow();
    });

    it('should reject empty or invalid file IDs', () => {
      expect(() => validateFileIdOrThrow('')).toThrow();
      expect(() => validateFileIdOrThrow('   ')).toThrow();
      expect(() => validateFileIdOrThrow('../etc/passwd')).toThrow();
      expect(() => validateFileIdOrThrow('foo/bar')).toThrow();
    });

    it('should include parameter name in error message', () => {
      try {
        validateFileIdOrThrow('', 'folderId');
      } catch (error: any) {
        expect(error.message).toContain('folderId');
      }
    });
  });

  describe('validateMimeTypeOrThrow', () => {
    it('should accept valid MIME types', () => {
      expect(() => validateMimeTypeOrThrow('text/plain')).not.toThrow();
      expect(() => validateMimeTypeOrThrow('application/json')).not.toThrow();
      expect(() => validateMimeTypeOrThrow('image/png')).not.toThrow();
    });

    it('should reject invalid MIME types', () => {
      expect(() => validateMimeTypeOrThrow('invalid')).toThrow();
      expect(() => validateMimeTypeOrThrow('text/<script>')).toThrow();
      expect(() => validateMimeTypeOrThrow('text/plain; drop table')).toThrow();
    });
  });

  describe('createMcpError', () => {
    it('should create MCP error with correct format', () => {
      const error = createMcpError(
        GoogleDriveErrorCode.InvalidFileId,
        'Test error message'
      );

      expect(error.code).toBe(GoogleDriveErrorCode.InvalidFileId);
      // Error message includes the error code prefix
      expect(error.message).toContain('Test error message');
      expect(error.message).toContain('MCP error');
    });
  });
});
