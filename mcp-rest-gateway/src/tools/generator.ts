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
   * Build internal tool mapping
   */
  private buildToolMap(): void {
    for (const api of this.config.apis) {
      for (const tool of api.tools) {
        if (this.toolMap.has(tool.name)) {
          throw new Error(`Duplicate tool name: ${tool.name}`);
        }
        this.toolMap.set(tool.name, { api, tool });
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
