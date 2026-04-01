#!/usr/bin/env node
/**
 * STDIO Transport Entry Point
 * This file sets up the MCP server to communicate via STDIO (stdin/stdout)
 */

import dotenv from 'dotenv';
import { RESTGatewayServer } from './server.js';
import { logger } from './utils/logger.js';
import { getServerVersion } from './utils/version.js';

// Load environment variables
dotenv.config();

let server: RESTGatewayServer | null = null;

async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting MCP REST Gateway Server (STDIO)');
  logger.info('='.repeat(60));

  try {
    const serverName = process.env.SERVER_NAME || 'mcp-rest-gateway';
    const serverVersion = getServerVersion();

    server = new RESTGatewayServer(serverName, serverVersion);
    await server.start();

    logger.info('📝 Press Ctrl+C to stop');

    // Keep process alive
    process.stdin.resume();

    // Handle stdin close (Docker/PETA Core scenario)
    process.stdin.on('close', () => {
      logger.info('[STDIO] stdin closed, shutting down...');
      shutdown('stdin-close').catch(() => process.exit(1));
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('❌ Failed to start server:', { error: errorMessage });
    process.exit(1);
  }
}

let shuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  logger.info(`\n👋 Received ${signal}, shutting down...`);
  if (server) {
    await server.stop();
  }
  process.exit(0);
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await shutdown('SIGINT');
});

process.on('SIGTERM', async () => {
  await shutdown('SIGTERM');
});

// Start the server
main().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error('Fatal error:', { error: errorMessage });
  process.exit(1);
});
