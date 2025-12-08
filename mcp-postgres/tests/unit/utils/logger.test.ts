import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Logger Utility', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let originalLogLevel: string | undefined;

  beforeEach(() => {
    // Save original LOG_LEVEL
    originalLogLevel = process.env.LOG_LEVEL;

    // Mock console.error
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore original LOG_LEVEL
    if (originalLogLevel === undefined) {
      delete process.env.LOG_LEVEL;
    } else {
      process.env.LOG_LEVEL = originalLogLevel;
    }

    // Clear all mocks
    vi.clearAllMocks();
    consoleErrorSpy.mockRestore();

    // Clear the module cache to reset the logger instance
    vi.resetModules();
  });

  describe('Log level filtering', () => {
    it('should log INFO and above when level is INFO (default)', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(3);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it('should log all levels when level is DEBUG', async () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it('should log only WARN and ERROR when level is WARN', async () => {
      process.env.LOG_LEVEL = 'WARN';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it('should log only ERROR when level is ERROR', async () => {
      process.env.LOG_LEVEL = 'ERROR';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[DEBUG]'));
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[INFO]'));
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(expect.stringContaining('[WARN]'));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[ERROR]'));
    });

    it('should not log anything when level is NONE', async () => {
      process.env.LOG_LEVEL = 'NONE';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe('Log message formatting', () => {
    it('should include timestamp in ISO format', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];

      // Check for ISO timestamp pattern: [YYYY-MM-DDTHH:mm:ss.sssZ]
      expect(logMessage).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/);
    });

    it('should include log level in message', async () => {
      process.env.LOG_LEVEL = 'DEBUG';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.debug('debug message');
      logger.info('info message');
      logger.warn('warn message');
      logger.error('error message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(4);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[DEBUG]');
      expect(consoleErrorSpy.mock.calls[1][0]).toContain('[INFO]');
      expect(consoleErrorSpy.mock.calls[2][0]).toContain('[WARN]');
      expect(consoleErrorSpy.mock.calls[3][0]).toContain('[ERROR]');
    });

    it('should include message content', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('Test message with content');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('Test message with content');
    });

    it('should include additional data as JSON', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      const data = { userId: 123, action: 'login' };
      logger.info('User action', data);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('User action');
      expect(logMessage).toContain(JSON.stringify(data));
      expect(logMessage).toContain('"userId":123');
      expect(logMessage).toContain('"action":"login"');
    });

    it('should format message without data when not provided', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('Simple message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toMatch(/\[.*\] \[INFO\] Simple message$/);
    });

    it('should handle complex data objects', async () => {
      process.env.LOG_LEVEL = 'ERROR';
      const { logger } = await import('../../../src/utils/logger.js');

      const complexData = {
        error: {
          code: 'PG001',
          message: 'Connection failed',
          details: { host: 'localhost', port: 5432 },
        },
        timestamp: new Date('2024-01-01T00:00:00.000Z'),
      };
      logger.error('Database error', complexData);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('Database error');
      expect(logMessage).toContain('"code":"PG001"');
      expect(logMessage).toContain('"message":"Connection failed"');
    });
  });

  describe('Log output destination', () => {
    it('should always output to stderr (console.error), never stdout', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('test message');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleLogSpy).not.toHaveBeenCalled();

      consoleLogSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty message', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('');

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      expect(consoleErrorSpy.mock.calls[0][0]).toContain('[INFO]');
    });

    it('should handle undefined data', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      logger.info('message', undefined);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).not.toContain('undefined');
    });

    it('should handle null data without JSON.stringify error', async () => {
      process.env.LOG_LEVEL = 'INFO';
      const { logger } = await import('../../../src/utils/logger.js');

      // null is falsy, so formatMessage should not include it
      logger.info('message', null);

      expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
      const logMessage = consoleErrorSpy.mock.calls[0][0];
      expect(logMessage).toContain('message');
      // null is falsy, so it won't be appended to the message
    });
  });
});
