/**
 * Logger Utility
 *
 * IMPORTANT: All logs go to stderr to keep stdout clean for MCP protocol (STDIO transport)
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

class Logger {
  private level: LogLevel;
  private readonly levels: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    NONE: 4,
  };

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'INFO';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.level];
  }

  private formatMessage(level: LogLevel, message: string, data?: unknown): string {
    const timestamp = new Date().toISOString();
    const dataStr = data ? ` ${JSON.stringify(data)}` : '';
    return `[${timestamp}] [${level}] ${message}${dataStr}`;
  }

  debug(message: string, data?: unknown): void {
    if (this.shouldLog('DEBUG')) {
      console.error(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: unknown): void {
    if (this.shouldLog('INFO')) {
      console.error(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.shouldLog('WARN')) {
      console.error(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, data?: unknown): void {
    if (this.shouldLog('ERROR')) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }
}

export const logger = new Logger();
