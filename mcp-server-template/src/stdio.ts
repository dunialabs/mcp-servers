/**
 * STDIO Transport Entry Point
 *
 * This file sets up the MCP server to communicate via STDIO (stdin/stdout).
 * STDIO transport is required for:
 * - Claude Desktop integration
 * - PETA Core integration
 * - Docker containerized deployments
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { MCPServer } from './server.js';
import { logger } from './utils/logger.js';

/**
 * Read version from package.json at runtime (single source of truth).
 * Falls back to '0.0.0' if the file cannot be read.
 */
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
  logger.info('🚀 Starting MCP Server Template (STDIO)');
  logger.info('='.repeat(60));

  try {
    const server = new MCPServer({
      name: process.env.SERVER_NAME || 'mcp-server-template',
      version: getVersion(),
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
