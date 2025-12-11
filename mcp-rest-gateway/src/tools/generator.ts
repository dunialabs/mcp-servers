/**
 * Tool generator
 * Dynamically generates MCP tools from API configuration
 */

import { z } from 'zod';
import { APIConfig, APIDefinition, ToolDefinition } from '../config/types.js';
import { ParameterMapper } from '../mapping/parameter-mapper.js';
import { logger } from '../utils/logger.js';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: z.AnyZodObject;
}

export class ToolGenerator {
  private config: APIConfig;
  private toolMap: Map<string, { api: APIDefinition; tool: ToolDefinition }>;

  constructor(config: APIConfig) {
    this.config = config;
    this.toolMap = new Map();
    this.buildToolMap();
  }

  /**
   * Sanitize name by removing invalid characters
   * Only keep: a-z, A-Z, 0-9, -, _
   * This filters out Chinese characters, emojis, and other non-ASCII characters
   */
  private sanitizeName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_]/g, '');
  }

  /**
   * Build internal tool mapping
   */
  private buildToolMap(): void {
    const MAX_API_PREFIX_LENGTH = 8;
    const MAX_TOOL_NAME_LENGTH = 64;

    for (const api of this.config.apis) {
      // 1. Sanitize API name (remove Chinese, emojis, etc.)
      let sanitizedApiName = this.sanitizeName(api.name);

      // Validate sanitized API name
      if (!sanitizedApiName) {
        logger.warn('[ToolGenerator] API name contains no valid characters after sanitization, using "api"', {
          originalName: api.name,
        });
        sanitizedApiName = 'api';
      }

      // 2. Truncate API name to max 8 characters
      const apiPrefix = sanitizedApiName.length > MAX_API_PREFIX_LENGTH
        ? sanitizedApiName.substring(0, MAX_API_PREFIX_LENGTH)
        : sanitizedApiName;

      for (const tool of api.tools) {
        // 3. Generate tool name with API prefix in camelCase
        // e.g., "qweather" + "getCurrentWeather" = "qweatherGetCurrentWeather"
        let prefixedToolName = apiPrefix + tool.name.charAt(0).toUpperCase() + tool.name.slice(1);

        // 4. Truncate final tool name to max 64 characters
        if (prefixedToolName.length > MAX_TOOL_NAME_LENGTH) {
          const originalName = prefixedToolName;
          prefixedToolName = prefixedToolName.substring(0, MAX_TOOL_NAME_LENGTH);
          logger.warn('[ToolGenerator] Tool name truncated to 64 characters', {
            original: originalName,
            truncated: prefixedToolName,
          });
        }

        // 5. Check for duplicates
        if (this.toolMap.has(prefixedToolName)) {
          throw new Error(`Duplicate tool name: ${prefixedToolName}`);
        }

        this.toolMap.set(prefixedToolName, { api, tool });
      }
    }

    logger.info('[ToolGenerator] Built tool map', {
      totalTools: this.toolMap.size,
    });
  }

  /**
   * Generate MCP tools list
   */
  generateTools(): MCPTool[] {
    const tools: MCPTool[] = [];

    for (const [toolName, { tool }] of this.toolMap) {
      tools.push({
        name: toolName,
        description: tool.description,
        inputSchema: ParameterMapper.generateSchema(tool.parameters),
      });
    }

    logger.debug('[ToolGenerator] Generated tools', { count: tools.length });
    return tools;
  }

  /**
   * Get tool definition by name
   */
  getToolDefinition(toolName: string): { api: APIDefinition; tool: ToolDefinition } | null {
    return this.toolMap.get(toolName) || null;
  }

  /**
   * Get all APIs
   */
  getAPIs(): APIDefinition[] {
    return this.config.apis;
  }
}
