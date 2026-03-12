#!/usr/bin/env node

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { PipedriveMcpServer } from './server.js';
import { logger } from './utils/logger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

config({ path: envPath });
process.env.MCP_TRANSPORT = 'stdio';

let mcpServer: PipedriveMcpServer | null = null;

async function main() {
  logger.info('[STDIO] Starting Pipedrive MCP Server');

  try {
    mcpServer = new PipedriveMcpServer();
    await mcpServer.initialize();

    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);

    logger.info('[STDIO] Pipedrive MCP Server connected via STDIO');
  } catch (error) {
    logger.error('[STDIO] Fatal error:', error);
    process.exit(1);
  }
}

async function shutdown(signal: string, exitCode = 0) {
  logger.info(`[STDIO] Received ${signal}, shutting down`);

  try {
    if (mcpServer) {
      await mcpServer.cleanup();
    }
    process.exit(exitCode);
  } catch (error) {
    logger.error('[STDIO] Shutdown error:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
  logger.error('[STDIO] Unhandled Rejection:', reason);
  shutdown('UNHANDLED_REJECTION', 1);
});
process.on('uncaughtException', (error) => {
  logger.error('[STDIO] Uncaught Exception:', error);
  shutdown('UNCAUGHT_EXCEPTION', 1);
});

main();
