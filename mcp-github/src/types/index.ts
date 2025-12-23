/**
 * Type definitions for the GitHub MCP Server
 */

export interface ServerConfig {
  name: string;
  version: string;
  description?: string;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface Resource {
  uri: string;
  name: string;
  description?: string;
  mimeType: string;
  content?: string;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ToolHandler<T = unknown> {
  (args: T): Promise<string | ToolResult>;
}
