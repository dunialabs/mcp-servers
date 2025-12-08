/**
 * Logging utility with automatic sanitization
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

class Logger {
  private level: LogLevel;
  private sensitiveKeys = [
    'authorization',
    'token',
    'apikey',
    'api_key',
    'api-key',
    'password',
    'secret',
    'bearer',
  ];

  constructor() {
    const envLevel = (process.env.LOG_LEVEL?.toUpperCase() || 'INFO') as LogLevel;
    this.level = ['DEBUG', 'INFO', 'WARN', 'ERROR'].includes(envLevel) ? envLevel : 'INFO';
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private sanitize(data: any): any {
    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: Record<string, any> = {};
      for (const [key, value] of Object.entries(data)) {
        const keyLower = key.toLowerCase();
        const isSensitive = this.sensitiveKeys.some((sk) => keyLower.includes(sk));

        if (isSensitive) {
          sanitized[key] = '[REDACTED]';
        } else if (typeof value === 'object') {
          sanitized[key] = this.sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }
      return sanitized;
    }

    return data;
  }

  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const sanitizedArgs = args.map((arg) => this.sanitize(arg));

    // Log to stderr (MCP requirement)
    console.error(
      JSON.stringify({
        timestamp,
        level,
        message,
        data: sanitizedArgs.length > 0 ? sanitizedArgs : undefined,
      })
    );
  }

  debug(message: string, ...args: any[]): void {
    this.log('DEBUG', message, ...args);
  }

  info(message: string, ...args: any[]): void {
    this.log('INFO', message, ...args);
  }

  warn(message: string, ...args: any[]): void {
    this.log('WARN', message, ...args);
  }

  error(message: string, ...args: any[]): void {
    this.log('ERROR', message, ...args);
  }
}

export const logger = new Logger();
