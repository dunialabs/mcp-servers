/**
 * Error handling utilities
 */

export class GatewayError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'GatewayError';
  }
}

export class ConfigError extends GatewayError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'CONFIG_ERROR', details);
    this.name = 'ConfigError';
  }
}

export class ValidationError extends GatewayError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class HTTPError extends GatewayError {
  constructor(
    message: string,
    public readonly statusCode: number,
    details?: Record<string, any>
  ) {
    super(message, 'HTTP_ERROR', details);
    this.name = 'HTTPError';
  }
}

export class ToolExecutionError extends GatewayError {
  constructor(message: string, details?: Record<string, any>) {
    super(message, 'TOOL_EXECUTION_ERROR', details);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Format error for MCP response
 */
export function formatMCPError(error: unknown): {
  content: Array<{ type: 'text'; text: string }>;
  isError: true;
} {
  let message = 'Unknown error';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return {
    content: [
      {
        type: 'text',
        text: `Error: ${message}`,
      },
    ],
    isError: true,
  };
}
