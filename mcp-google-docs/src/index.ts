#!/usr/bin/env node

/**
 * Google Docs MCP Server - Entry Point
 *
 * Read, write, and edit Google Documents via MCP protocol.
 */

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPServer } from './server.js';
import { logger } from './utils/logger.js';

// Load environment variables from .env file
config();

async function main() {
  logger.info('='.repeat(60));
  logger.info('Starting Google Docs MCP Server');
  logger.info('='.repeat(60));

  try {
    const server = new MCPServer({
      name: process.env.SERVER_NAME || 'mcp-google-docs',
      version: process.env.SERVER_VERSION || '1.0.0',
      description: 'Google Docs MCP Server - Read, write, and edit Google Documents',
    });

    await server.initialize();

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logger.info('Server is ready to accept requests');
  } catch (error) {
    logger.error('Fatal error starting server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
process.on('SIGINT', () => {
  logger.info('Received SIGINT signal, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM signal, shutting down gracefully...');
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the server
main().catch((error) => {
  logger.error('Unhandled error in main():', error);
  process.exit(1);
});
