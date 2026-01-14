/**
 * Logger utility with sensitive data sanitization
 */

import type { LogLevel } from '../types/index.js';

/**
 * Sanitize sensitive data from logs
 */
function sanitizeForLog(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitivePatterns = [
    'secret',
    'key',
    'token',
    'password',
    'api_key',
    'client_secret',
    'card',
    'cvc',
    'cvv',
    'ssn',
    'tax_id',
    'account_number',
    'routing_number',
  ];

  const sanitized: any = Array.isArray(data) ? [] : {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    const isSensitive = sensitivePatterns.some((pattern) => keyLower.includes(pattern));

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeForLog(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Logger class for structured logging
 */
class Logger {
  private level: LogLevel;
  private readonly levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];

  constructor() {
    this.level = (process.env.LOG_LEVEL as LogLevel) || 'info';
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels.indexOf(level) >= this.levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(meta ? sanitizeForLog(meta) : {}),
    };

    // MCP servers use stderr for logging (stdout is reserved for MCP protocol)
    console.error(JSON.stringify(logEntry));
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }
}

export const logger = new Logger();
export { sanitizeForLog };
