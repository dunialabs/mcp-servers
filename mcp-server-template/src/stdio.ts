/**
 * STDIO Transport Entry Point
 *
 * This file sets up the MCP server to communicate via STDIO (stdin/stdout).
 * STDIO transport is required for:
 * - Claude Desktop integration
 * - PETA Core integration
 * - Docker containerized deployments
 */

import { MCPServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting MCP Server Template (STDIO)');
  logger.info('='.repeat(60));

  try {
    const server = new MCPServer({
      name: process.env.SERVER_NAME || 'mcp-server-template',
      version: process.env.SERVER_VERSION || '1.0.0',
      description: 'MCP Server Template with STDIO transport',
    });

    // Start the server with STDIO transport
    await server.start();

    logger.info('✅ MCP Server is ready and listening on STDIO');
    logger.info('📝 Press Ctrl+C to stop');
  } catch (error: any) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('\n👋 Shutting down MCP Server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('\n👋 Shutting down MCP Server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  logger.error('Fatal error:', error);
  process.exit(1);
});
