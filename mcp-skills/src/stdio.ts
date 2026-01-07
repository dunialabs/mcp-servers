#!/usr/bin/env node

/**
 * STDIO entry point for Skills MCP Server
 */

import { SkillsMCPServer } from './server.js';
import { logger } from './utils/logger.js';

async function main() {
  try {
    // Get skills directory from environment variable (lowercase for consistency)
    const skillsDir = process.env.skills_dir || '/app/skills';

    logger.info('[Main] Starting Skills MCP Server...');
    logger.info(`[Main] Skills directory: ${skillsDir}`);

    // Create and initialize server
    const server = new SkillsMCPServer({
      name: 'mcp-skills',
      version: '1.0.0',
      skillsDir,
    });

    // Initialize (scan skills)
    await server.initialize();

    // Start server
    await server.start();
  } catch (error) {
    logger.error('[Main] Failed to start server:', error);
    process.exit(1);
  }
}

main();
