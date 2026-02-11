#!/usr/bin/env node

/**
 * Intercom MCP Server - STDIO Entry Point
 */

import { IntercomMCPServer } from './server.js';
import { logger } from './utils/logger.js';

// Configure logger to use stderr for all output (required for STDIO transport)
// Ensure all console.* calls go to stderr to avoid polluting stdout
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
  debug: console.debug
};

// Redirect all console output to stderr
console.log = (...args) => originalConsole.error(...args);
console.info = (...args) => originalConsole.error(...args);
console.warn = (...args) => originalConsole.error(...args);
console.debug = (...args) => originalConsole.error(...args);

async function main() {
  try {
    const server = new IntercomMCPServer({
      name: 'mcp-intercom',
      version: '1.0.0',
      description: 'Intercom MCP Server - Manage conversations, contacts, companies, and more through Intercom API'
    });

    await server.initialize();
    await server.start();
  } catch (error) {
    logger.error('[Main] Fatal error:', error);
    process.exit(1);
  }
}

main();
