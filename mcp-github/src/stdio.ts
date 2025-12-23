#!/usr/bin/env node

/**
 * GitHub MCP Server - STDIO Entry Point
 * For Console and Claude Desktop integration
 */

import { config } from 'dotenv';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { GitHubMcpServer } from './server.js';
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

async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting GitHub MCP Server (STDIO Mode)');
  logger.info('='.repeat(60));

  try {
    // Validate that access token is set
    if (!process.env.accessToken) {
      logger.error('❌ ERROR: accessToken environment variable is not set');
      logger.error('');
      logger.error('Please set the accessToken environment variable with your GitHub token:');
      logger.error('  export accessToken="ghp_xxxxxxxxxxxx"');
      logger.error('');
      logger.error('Or configure it in your MCP client (Console/Claude Desktop)');
      logger.error('');
      logger.error('To create a GitHub Personal Access Token:');
      logger.error('  1. Go to https://github.com/settings/tokens');
      logger.error('  2. Click "Generate new token" > "Generate new token (classic)"');
      logger.error('  3. Select scopes: repo, read:user, user:email');
      logger.error('  4. Generate token and copy it');
      logger.error('');
      process.exit(1);
    }

    logger.info('✅ Access token found');

    // Create server instance
    const mcpServer = new GitHubMcpServer();
    await mcpServer.initialize();

    // Create STDIO transport
    const transport = new StdioServerTransport();

    // Connect server to transport
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
