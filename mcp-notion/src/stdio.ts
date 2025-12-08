#!/usr/bin/env node

/**
 * Notion MCP Server - STDIO Entry Point
 * For Claude Desktop integration
 */

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { NotionMcpServer } from './server.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root
const envPath = path.resolve(__dirname, '..', '.env');
config({ path: envPath });

// Mark this as STDIO mode so logger writes to stderr
process.env.MCP_TRANSPORT = 'stdio';

async function main() {
  logger.info('[STDIO] Starting Notion MCP Server (STDIO Mode)');

  try {
    // Create server instance
    const mcpServer = new NotionMcpServer();
    await mcpServer.initialize();

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await mcpServer.connect(transport);

    logger.info('[STDIO] MCP server connected via STDIO');
    logger.info('[STDIO] Waiting for requests from Claude Desktop...');
  } catch (error: any) {
    logger.error('[STDIO] Fatal error:', error);
    process.exit(1);
  }
}

// Error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('[STDIO] Unhandled Rejection:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('[STDIO] Uncaught Exception:', error);
  process.exit(1);
});

// Start server
main();
