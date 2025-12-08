/**
 * Simple logger utility for MCP server
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

class Logger {
  private level: LogLevel;
  private isStdioMode: boolean;

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    switch (envLevel) {
      case 'DEBUG':
        this.level = LogLevel.DEBUG;
        break;
      case 'INFO':
        this.level = LogLevel.INFO;
        break;
      case 'WARN':
        this.level = LogLevel.WARN;
        break;
      case 'ERROR':
        this.level = LogLevel.ERROR;
        break;
      case 'NONE':
        this.level = LogLevel.NONE;
        break;
      default:
        // Default to INFO in production, DEBUG in development
        this.level = process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG;
    }

    // Detect if running in STDIO mode (check if we're being run by Claude Desktop)
    // In STDIO mode, we must not pollute stdout as it's used for JSON-RPC communication
    this.isStdioMode = process.env.MCP_TRANSPORT === 'stdio' ||
                       process.argv[1]?.includes('stdio.js') ||
                       !process.stdout.isTTY;
  }

  /**
   * Redact sensitive information from log messages
   * Protects tokens, email addresses, and other PII
   */
  private redactSensitiveData(data: any, visited: WeakSet<object> = new WeakSet()): any {
    if (typeof data === 'string') {
      let redacted = data;

      // Redact Figma OAuth tokens (figd_*)
      redacted = redacted.replace(/figd_[a-zA-Z0-9._-]+/g, 'figd_***REDACTED***');

      // Redact Bearer tokens
      redacted = redacted.replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer ***REDACTED***');

      // Redact authorization headers
      redacted = redacted.replace(/(authorization|x-figma-token|x-user-access-token):\s*[^\s]+/gi, '$1: ***REDACTED***');

      // Redact email addresses (keep first char + domain)
      redacted = redacted.replace(/\b([a-zA-Z0-9])[a-zA-Z0-9._-]*@([a-zA-Z0-9.-]+)/g, '$1***@$2');

      // Redact long file IDs in resource URIs (keep first 10 chars)
      redacted = redacted.replace(/figma:\/\/\/([a-zA-Z0-9_-]{10})[a-zA-Z0-9_-]{10,}/g, 'figma:///$1***');

      return redacted;
    }

    if (typeof data === 'object' && data !== null) {
      // Prevent circular reference infinite loops
      if (visited.has(data)) {
        return '[Circular Reference]';
      }
      visited.add(data);

      // Handle arrays
      if (Array.isArray(data)) {
        return data.map(item => this.redactSensitiveData(item, visited));
      }

      // Handle plain objects
      const redacted: any = {};
      try {
        // Use Object.keys to avoid private properties and prototypes
        const keys = Object.keys(data);
        for (const key of keys) {
          // Skip private members (starting with #)
          if (key.startsWith('#')) {
            continue;
          }

          const lowerKey = key.toLowerCase();

          // Completely redact sensitive fields
          if (['access_token', 'refresh_token', 'token', 'authorization', 'password', 'secret'].includes(lowerKey)) {
            redacted[key] = '***REDACTED***';
          } else {
            try {
              redacted[key] = this.redactSensitiveData(data[key], visited);
            } catch (error) {
              // If we can't access a property, skip it
              redacted[key] = '[Inaccessible]';
            }
          }
        }
      } catch (error) {
        // If we can't enumerate properties, return a safe string
        return '[Object]';
      }
      return redacted;
    }

    // Return primitives as-is
    return data;
  }

  private log(level: LogLevel, prefix: string, ...args: any[]): void {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${prefix}`;

    // Redact sensitive data from all arguments
    const redactedArgs = args.map(arg => this.redactSensitiveData(arg));

    // In STDIO mode, write all logs to stderr to avoid polluting stdout
    // stdout is reserved for MCP JSON-RPC protocol communication
    if (this.isStdioMode) {
      process.stderr.write(`${message} ${redactedArgs.map(a =>
        typeof a === 'object' ? JSON.stringify(a) : String(a)
      ).join(' ')}\n`);
      return;
    }

    // In HTTP mode, use normal console methods
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(message, ...redactedArgs);
        break;
      case LogLevel.INFO:
        console.log(message, ...redactedArgs);
        break;
      case LogLevel.WARN:
        console.warn(message, ...redactedArgs);
        break;
      case LogLevel.ERROR:
        console.error(message, ...redactedArgs);
        break;
    }
  }

  debug(...args: any[]): void {
    this.log(LogLevel.DEBUG, '[DEBUG]', ...args);
  }

  info(...args: any[]): void {
    this.log(LogLevel.INFO, '[INFO]', ...args);
  }

  warn(...args: any[]): void {
    this.log(LogLevel.WARN, '[WARN]', ...args);
  }

  error(...args: any[]): void {
    this.log(LogLevel.ERROR, '[ERROR]', ...args);
  }
}

export const logger = new Logger();
