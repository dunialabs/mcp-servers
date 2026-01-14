#!/usr/bin/env node

/**
 * STDIO entry point for Stripe MCP Server
 */

import dotenv from 'dotenv';
import { runServer } from './server.js';
import { logger } from './utils/logger.js';

// Load environment variables from .env file
dotenv.config();

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
  process.exit(1);
});

// Start the server
runServer().catch((error) => {
  logger.error('Failed to start server', {
    message: error.message,
    stack: error.stack,
  });
  process.exit(1);
});
