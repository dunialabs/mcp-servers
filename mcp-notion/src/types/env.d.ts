/**
 * Type definitions for environment variables
 */

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      /**
       * Notion Integration Token or OAuth Access Token
       * Example: secret_xxx...
       */
      notionToken?: string;

      /**
       * HTTP proxy URL
       * Example: http://host.docker.internal:7897
       */
      HTTP_PROXY?: string;

      /**
       * HTTPS proxy URL
       * Example: http://host.docker.internal:7897
       */
      HTTPS_PROXY?: string;

      /**
       * Log level: DEBUG | INFO | WARN | ERROR | NONE
       * Default: DEBUG in development, INFO in production
       */
      LOG_LEVEL?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'NONE';

      /**
       * MCP transport mode: stdio | http
       * Automatically set by entry point scripts
       */
      MCP_TRANSPORT?: 'stdio' | 'http';

      /**
       * Node environment
       */
      NODE_ENV?: 'development' | 'production' | 'test';
    }
  }
}

export {};
