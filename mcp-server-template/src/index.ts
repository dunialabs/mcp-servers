#!/usr/bin/env node

/**
 * MCP Server Template - Entry Point
 *
 * A complete, production-ready TypeScript template for building MCP servers
 * following all best practices.
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPServer } from './server.js';
import { logger } from './utils/logger.js';

// Load environment variables from .env file
config();

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const raw = readFileSync(path.resolve(__dirname, '..', 'package.json'), 'utf8');
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

async function main() {
  logger.info('='.repeat(60));
  logger.info('Starting MCP Server Template');
  logger.info('='.repeat(60));

  try {
    const server = new MCPServer({
      name: process.env.SERVER_NAME || 'mcp-server-template',
      version: getVersion(),
      description: 'A complete TypeScript MCP server template with best practices',
    });

    await server.start();

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
