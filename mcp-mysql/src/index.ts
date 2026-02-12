#!/usr/bin/env node

/**
 * MySQL MCP Server Entry Point
 *
 * Initializes the MCP server with proper lifecycle management:
 * - Database connection initialization
 * - STDIO transport setup
 * - Signal handling (SIGTERM, SIGINT)
 * - Stdin close detection (critical for Docker --rm)
 */

import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { initDatabase, closeDatabase } from './db/connection.js';
import { createServer } from './server.js';
import { logger } from './utils/logger.js';

let isShuttingDown = false;

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.debug(`[shutdown] Already shutting down, ignoring ${signal}`);
    return;
  }

  isShuttingDown = true;
  logger.info(`[shutdown] Received ${signal}, starting graceful shutdown...`);

  try {
    await closeDatabase();
    logger.info('[shutdown] Database connection closed');

    await new Promise((resolve) => setTimeout(resolve, 100));

    logger.info('[shutdown] Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('[shutdown] Error during shutdown:', error);
    process.exit(1);
  }
}

function setupStdinMonitoring(): void {
  process.stdin.on('end', () => {
    logger.info('[stdin] Input stream closed, initiating shutdown...');
    shutdown('STDIN_CLOSE').catch((error) => {
      logger.error('[stdin] Shutdown error:', error);
      process.exit(1);
    });
  });

  process.stdin.on('error', (error) => {
    logger.error('[stdin] Input stream error:', error);
    shutdown('STDIN_ERROR').catch((err) => {
      logger.error('[stdin] Shutdown error:', err);
      process.exit(1);
    });
  });

  process.stdin.resume();
}

async function main(): Promise<void> {
  try {
    logger.info('='.repeat(60));
    logger.info('Starting MySQL MCP Server');
    logger.info('='.repeat(60));

    const mysqlUrl = process.env.MYSQL_URL;
    if (!mysqlUrl) {
      throw new Error(
        'MYSQL_URL environment variable is required. ' +
          'Example: mysql://user:password@host:3306/database'
      );
    }

    const connectTimeout = process.env.MYSQL_CONNECT_TIMEOUT
      ? parseInt(process.env.MYSQL_CONNECT_TIMEOUT, 10)
      : 10000;

    logger.info('[main] Initializing database connection...');
    await initDatabase({ uri: mysqlUrl, connectTimeout });
    logger.info('[main] Database connection established');

    logger.info('[main] Creating MCP server instance...');
    const server = createServer();

    logger.info('[main] Setting up STDIO transport...');
    const transport = new StdioServerTransport();

    await server.connect(transport);
    logger.info('MySQL MCP Server is ready');
    logger.info(
      'Available tools: mysqlListDatabases, mysqlListTables, mysqlDescribeTable, mysqlGetTableStats, mysqlExecuteQuery, mysqlExecuteWrite, mysqlExplainQuery, mysqlShowCreateTable, mysqlShowProcessList'
    );

    setupStdinMonitoring();

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

main();
