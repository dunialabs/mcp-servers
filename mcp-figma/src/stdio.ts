#!/usr/bin/env node
/**
 * STDIO entry point for Figma MCP Server
 * Starts the server with STDIO transport for communication with Claude Desktop
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { FigmaMcpServer } from './server.js';
import { logger } from './utils/logger.js';

process.env.MCP_TRANSPORT = 'stdio';

async function main() {
  try {
    logger.info('[STDIO] Starting Figma MCP Server...');

    const server = new FigmaMcpServer();
    await server.initialize();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('[STDIO] Figma MCP Server started successfully');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('[STDIO] Received SIGINT, shutting down...');
      await server.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('[STDIO] Received SIGTERM, shutting down...');
      await server.cleanup();
      process.exit(0);
    });
  } catch (error) {
    logger.error('[STDIO] Failed to start server:', error);
    process.exit(1);
  }
}

main();
