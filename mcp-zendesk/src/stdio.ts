#!/usr/bin/env node

/**
 * Zendesk MCP Server - STDIO Entry Point
 * For Console and Claude Desktop integration
 */

import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory of this script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from project root FIRST
const envPath = path.resolve(__dirname, '..', '.env');
config({ path: envPath });

// Mark this as STDIO mode so logger writes to stderr
process.env.MCP_TRANSPORT = 'stdio';

// Now import modules that depend on environment variables
const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
const { ZendeskMcpServer } = await import('./server.js');
const { logger } = await import('./utils/logger.js');

async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting Zendesk MCP Server (STDIO Mode)');
  logger.info('='.repeat(60));

  try {
    // Create server instance
    const mcpServer = new ZendeskMcpServer();

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport (this will call initialize())
    await mcpServer.connect(transport);

    logger.info('✅ MCP Server connected via STDIO');
    logger.info('📡 Ready to receive requests from Claude Desktop or Console');
    logger.info('='.repeat(60));
  } catch (error: any) {
    logger.error('❌ Fatal error during startup:', error);
    logger.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Error handlers
process.on('unhandledRejection', (reason, promise) => {
  logger.error('🔴 Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('🔴 Uncaught Exception:', error);
  logger.error('Stack trace:', error.stack);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('');
  logger.info('Received SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('');
  logger.info('Received SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start server
main();
