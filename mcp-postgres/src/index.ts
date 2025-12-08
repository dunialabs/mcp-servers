#!/usr/bin/env node

/**
 * PostgreSQL MCP Server Entry Point
 *
 * This file initializes the MCP server with proper lifecycle management:
 * - Database connection initialization
 * - STDIO transport setup
 * - Signal handling (SIGTERM, SIGINT)
 * - Stdin close detection (critical for Docker --rm)
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initDatabase, closeDatabase } from './db/connection.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

/**
 * Graceful shutdown handler
 */
async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.debug(`[shutdown] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`[shutdown] Received ${signal}, starting graceful shutdown...`);

  try {
    // Close database connection
    await closeDatabase();
    logger.info('[shutdown] Database connection closed');

    // Give time for any pending operations
    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.info('[shutdown] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('[shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

/**
 * Setup stdin close detection
 * CRITICAL: This ensures containers exit when Claude Desktop disconnects
 */
function setupStdinMonitoring(): void {
  // Monitor stdin close (happens when parent process exits)
  process.stdin.on('end', () => {
    logger.info('[stdin] Input stream closed, initiating shutdown...');
    shutdown('STDIN_CLOSE').catch((error) => {
      logger.error('[stdin] Shutdown error:', error);
      process.exit(1);
    });
  });

  // Handle stdin errors
  process.stdin.on('error', (error) => {
    logger.error('[stdin] Input stream error:', error);
    shutdown('STDIN_ERROR').catch((err) => {
      logger.error('[stdin] Shutdown error:', err);
      process.exit(1);
    });
  });

  // Resume stdin to enable 'end' event detection
  // Without this, the 'end' event won't fire
  process.stdin.resume();
}

/**
 * Main server initialization
 */
async function main(): Promise<void> {
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting PostgreSQL MCP Server');
    logger.info('='.repeat(60));

    // Validate required environment variables
    const connectionString = process.env.POSTGRES_URL;
    if (!connectionString) {
      throw new Error(
        'POSTGRES_URL environment variable is required. ' +
          'Example: postgresql://user:password@host:5432/database'
      );
    }

    // Get access mode
    const accessMode = (process.env.ACCESS_MODE as 'readonly' | 'readwrite') || 'readonly';
    if (accessMode !== 'readonly' && accessMode !== 'readwrite') {
      throw new Error('ACCESS_MODE must be "readonly" or "readwrite"');
    }

    // Initialize database connection
    logger.info('[main] Initializing database connection...');
    await initDatabase({ connectionString }, accessMode);
    logger.info('[main] Database connection established');

    // Create MCP server instance
    logger.info('[main] Creating MCP server instance...');
    const server = createServer();

    // Setup STDIO transport
    logger.info('[main] Setting up STDIO transport...');
    const transport = new StdioServerTransport();

    // Connect server to transport
    await server.connect(transport);
    logger.info('✅ PostgreSQL MCP Server is ready');
    logger.info(
      '📍 Available tools: postgresListSchemas, postgresListTables, postgresDescribeTable, postgresGetTableStats, postgresExecuteQuery, postgresExecuteWrite, postgresExplainQuery'
    );

    // Setup stdin monitoring (critical for Docker lifecycle)
    setupStdinMonitoring();

    // Setup signal handlers
    process.on('SIGTERM', () => {
      shutdown('SIGTERM').catch((error) => {
        logger.error('[SIGTERM] Shutdown error:', error);
        process.exit(1);
      });
    });

    process.on('SIGINT', () => {
      shutdown('SIGINT').catch((error) => {
        logger.error('[SIGINT] Shutdown error:', error);
        process.exit(1);
      });
    });

    // Handle uncaught errors
    process.on('uncaughtException', (error) => {
      logger.error('[uncaughtException] Fatal error:', error);
      shutdown('UNCAUGHT_EXCEPTION').catch((err) => {
        logger.error('[uncaughtException] Shutdown error:', err);
        process.exit(1);
      });
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('[unhandledRejection] Unhandled promise rejection:', reason);
      shutdown('UNHANDLED_REJECTION').catch((error) => {
        logger.error('[unhandledRejection] Shutdown error:', error);
        process.exit(1);
      });
    });

    logger.info('[main] Server initialization complete');
  } catch (error) {
    logger.error('[main] Failed to start server:', error);
    process.exit(1);
  }
}

// Start the server
main();
