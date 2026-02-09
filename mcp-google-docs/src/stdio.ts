#!/usr/bin/env node

/**
 * Google Docs MCP Server - STDIO Transport Entry Point
 * For Claude Desktop and PETA Core integration
 */

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPServer } from './server.js';
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

let mcpServer: MCPServer | null = null;

async function main() {
  logger.info('[STDIO] Starting Google Docs MCP Server (STDIO Mode)');

  try {
    // Create server instance
    mcpServer = new MCPServer({
      name: process.env.SERVER_NAME || 'mcp-google-docs',
      version: process.env.SERVER_VERSION || '1.0.0',
      description: 'Google Docs MCP Server - Read, write, and edit Google Documents',
    });

    // Initialize (register tools and handlers)
    await mcpServer.initialize();

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport
    await mcpServer.connect(transport);

    logger.info('[STDIO] MCP server connected via STDIO');
    logger.info('[STDIO] Waiting for requests...');
  } catch (error: any) {
    logger.error('[STDIO] Fatal error:', error?.message || error);
    if (error?.stack) {
      logger.error('[STDIO] Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Graceful shutdown handler
function shutdown(signal: string) {
  logger.info(`[STDIO] Received ${signal}, shutting down...`);
  process.exit(0);
}

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

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
