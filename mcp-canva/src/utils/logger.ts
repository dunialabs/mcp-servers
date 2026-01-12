/**
 * Logger utility
 *
 * IMPORTANT: All logs go to stderr (console.error) to avoid polluting stdout.
 * This is essential for STDIO transport mode where stdout is used for MCP protocol.
 */

import type { LogLevel } from '../types/index.js';

class Logger {
  private isDevelopment = process.env.NODE_ENV !== 'production';

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    // Skip debug logs in production
    if (!this.isDevelopment && level === 'debug') return;

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;

    // ALWAYS use console.error (stderr) for MCP logging
    switch (level) {
      case 'error':
        console.error(prefix, message, ...args);
        break;
      case 'warn':
        console.error(prefix, message, ...args);
        break;
      case 'debug':
        console.error(prefix, message, ...args);
        break;
      default:
        console.error(prefix, message, ...args);
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }
}

export const logger = new Logger();
