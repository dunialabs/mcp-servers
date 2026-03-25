#!/usr/bin/env node
import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { MCPAppsTestServer } from './server.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '..', '.env') });
process.env.MCP_TRANSPORT = 'stdio';

async function main() {
  const server = new MCPAppsTestServer();
  await server.initialize();
  await server.connect(new StdioServerTransport());
  logger.info('[stdio] MCP Apps Test server ready');
}

main().catch((error) => {
  logger.error('[stdio] Fatal error', error);
  process.exit(1);
});
