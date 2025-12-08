#!/usr/bin/env node
/**
 * STDIO Transport Entry Point
 * This file sets up the MCP server to communicate via STDIO (stdin/stdout)
 */

import dotenv from 'dotenv';
import { RESTGatewayServer } from './server.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting MCP REST Gateway Server (STDIO)');
  logger.info('='.repeat(60));

  try {
    const serverName = process.env.SERVER_NAME || 'mcp-rest-gateway';
    const serverVersion = process.env.SERVER_VERSION || '1.0.0';

    const server = new RESTGatewayServer(serverName, serverVersion);
    await server.start();

    logger.info('📝 Press Ctrl+C to stop');

    // Keep process alive
    process.stdin.resume();

    // Handle stdin close (Docker/PETA Core scenario)
    process.stdin.on('close', () => {
      logger.info('[STDIO] stdin closed, shutting down...');
      server.stop().then(() => {
        process.exit(0);
      });
    });
  } catch (error: any) {
    logger.error('❌ Failed to start server:', { error: error.message });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  logger.info('\n👋 Received SIGINT, shutting down...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('\n👋 Received SIGTERM, shutting down...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Fatal error:', { error: error.message });
  process.exit(1);
});
