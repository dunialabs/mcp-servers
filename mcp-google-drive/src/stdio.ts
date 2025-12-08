#!/usr/bin/env node

/**
 * Google Drive MCP Server - STDIO Entry Point
 * For Claude Desktop integration
 */

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GoogleDriveMcpServer } from './server.js';
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

let mcpServer: GoogleDriveMcpServer | null = null;

async function main() {
  logger.info('[STDIO] Starting Google Drive MCP Server (STDIO Mode)');

  try {
    // Create server instance
    mcpServer = new GoogleDriveMcpServer();
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

// Graceful shutdown handler
async function shutdown(signal: string) {
  logger.info(`[STDIO] Received ${signal}, initiating graceful shutdown...`);

  try {
    if (mcpServer) {
      await mcpServer.cleanup();
    }

    logger.info('[STDIO] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('[STDIO] Error during shutdown:', error);
    process.exit(1);
  }
}

// Signal handlers
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Error handlers
process.on('unhandledRejection', (reason) => {
  logger.error('[STDIO] Unhandled Rejection:', reason);
  shutdown('UNHANDLED_REJECTION');
});

process.on('uncaughtException', (error) => {
  logger.error('[STDIO] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION');
});

// Start server
main();
