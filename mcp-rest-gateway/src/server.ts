/**
 * MCP REST Gateway Server
 * Main server implementation
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ConfigLoader } from './config/loader.js';
import { ConfigValidator } from './config/validator.js';
import { ToolExecutor } from './tools/executor.js';
import { formatMCPError } from './utils/errors.js';
import { logger } from './utils/logger.js';

export class RESTGatewayServer {
  private server: McpServer;
  private executor: ToolExecutor | null = null;
  private transport: StdioServerTransport | null = null;

  constructor(
    private serverName: string = 'mcp-rest-gateway',
    private serverVersion: string = '1.0.0'
  ) {
    this.server = new McpServer({
      name: this.serverName,
      version: this.serverVersion,
    });
  }

  /**
   * Initialize server with configuration
   */
  async initialize(): Promise<void> {
    logger.info('[Server] Initializing REST Gateway Server...', {
      name: this.serverName,
      version: this.serverVersion,
    });

    try {
      // 1. Load configuration
      logger.info('[Server] Loading configuration...');
      const rawConfig = await ConfigLoader.load();

      // 2. Validate configuration
      logger.info('[Server] Validating configuration...');
      const config = ConfigValidator.validate(rawConfig);

      logger.info('[Server] Configuration validated', {
        apis: config.apis.length,
        totalTools: config.apis.reduce((sum, api) => sum + api.tools.length, 0),
      });

      // 3. Initialize tool executor
      this.executor = new ToolExecutor(config);
      const tools = this.executor.getTools();

      logger.info('[Server] Tools generated', {
        count: tools.length,
      });

      // 4. Register handlers
      this.registerHandlers();

      logger.info('[Server] Initialization complete');
    } catch (error: any) {
      logger.error('[Server] Initialization failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Register MCP handlers
   */
  private registerHandlers(): void {
    if (!this.executor) {
      throw new Error('Executor not initialized');
    }

    const executor = this.executor;
    const tools = executor.getTools();

    // Register each tool individually
    for (const tool of tools) {
      this.server.registerTool(
        tool.name,
        {
          title: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema as any,
        },
        async (args: any) => {
          logger.info('[Server] Tool called', { toolName: tool.name });

          try {
            const result = await executor.execute(tool.name, args || {});
            return result;
          } catch (error: any) {
            logger.error('[Server] Tool execution error', {
              toolName: tool.name,
              error: error.message,
            });
            return formatMCPError(error);
          }
        }
      );
    }

    logger.debug('[Server] Tools registered', { count: tools.length });
  }

  /**
   * Start the server with STDIO transport
   */
  async start(): Promise<void> {
    // Initialize if not already done
    if (!this.executor) {
      await this.initialize();
    }

    // Create and connect transport
    this.transport = new StdioServerTransport();
    await this.server.connect(this.transport);

    logger.info('[Server] ✅ REST Gateway Server is ready');
    logger.info('[Server] Listening on STDIO');
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    logger.info('[Server] Shutting down...');

    if (this.transport) {
      await this.server.close();
      this.transport = null;
    }

    logger.info('[Server] Shutdown complete');
  }
}
