/**
 * Tool executor
 * Executes MCP tools by calling REST APIs
 */

import { APIConfig } from '../config/types.js';
import { HTTPClient } from '../http/client.js';
import { ParameterMapper } from '../mapping/parameter-mapper.js';
import { ResponseTransformer } from '../mapping/response-transformer.js';
import { ToolGenerator } from './generator.js';
import { ToolExecutionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export class ToolExecutor {
  private generator: ToolGenerator;
  private httpClients: Map<string, HTTPClient>;

  constructor(config: APIConfig) {
    this.generator = new ToolGenerator(config);
    this.httpClients = new Map();
    this.initializeHTTPClients(config);
  }

  /**
   * Initialize HTTP clients for each API
   */
  private initializeHTTPClients(config: APIConfig): void {
    for (const api of config.apis) {
      const client = new HTTPClient(api.baseUrl, api.auth, api.headers, api.timeout);
      this.httpClients.set(api.name, client);
    }

    logger.info('[ToolExecutor] Initialized HTTP clients', {
      count: this.httpClients.size,
    });
  }

  /**
   * Get available tools
   */
  getTools() {
    return this.generator.generateTools();
  }

  /**
   * Execute a tool
   */
  async execute(
    toolName: string,
    args: Record<string, any>
  ): Promise<{
    content: Array<{ type: 'text'; text: string }>;
    isError?: boolean;
  }> {
    logger.info('[ToolExecutor] Executing tool', { toolName });

    // Get tool definition
    const toolData = this.generator.getToolDefinition(toolName);
    if (!toolData) {
      throw new ToolExecutionError(`Tool not found: ${toolName}`);
    }

    const { api, tool } = toolData;

    // Get HTTP client
    const client = this.httpClients.get(api.name);
    if (!client) {
      throw new ToolExecutionError(`HTTP client not found for API: ${api.name}`);
    }

    try {
      // 1. Map parameters
      const { path, query, body, headers } = ParameterMapper.mapParameters(
        args,
        tool.parameters,
        tool.endpoint
      );

      // 2. Merge headers
      const finalHeaders = { ...tool.headers, ...headers };

      // 3. Send request
      const response = await client.request(tool.method, path, {
        params: query,
        data: Object.keys(body).length > 0 ? body : undefined,
        headers: finalHeaders,
        timeout: tool.timeout,
      });

      // 4. Transform response
      let transformed = ResponseTransformer.transform(response, tool.response);

      // 5. Enforce max size
      transformed = ResponseTransformer.enforceMaxSize(transformed);

      // 6. Format for MCP
      const text =
        typeof transformed === 'string' ? transformed : JSON.stringify(transformed, null, 2);

      logger.info('[ToolExecutor] Tool executed successfully', {
        toolName,
        responseLength: text.length,
      });

      return {
        content: [
          {
            type: 'text',
            text,
          },
        ],
      };
    } catch (error: any) {
      const errorMessage = ResponseTransformer.extractError(error, tool.response?.errorPath);

      logger.error('[ToolExecutor] Tool execution failed', {
        toolName,
        error: errorMessage,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Error: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }
}
