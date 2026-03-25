#!/usr/bin/env node

/**
 * Google Calendar MCP Server - Streamable HTTP Entry Point
 * For local MCP Apps testing.
 */

import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { GoogleCalendarMcpServer } from './server.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '..', '.env');

config({ path: envPath });
process.env.MCP_TRANSPORT = 'http';

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '127.0.0.1';

let mcpServer: GoogleCalendarMcpServer | null = null;
let transport: StreamableHTTPServerTransport | null = null;

async function main() {
  mcpServer = new GoogleCalendarMcpServer();
  await mcpServer.initialize();

  transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await mcpServer.connect(transport);

  const app = createMcpExpressApp({ host });

  app.use(
    cors({
      origin: true,
      methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'Last-Event-ID', 'MCP-Protocol-Version'],
      exposedHeaders: ['Mcp-Session-Id', 'mcp-session-id'],
    })
  );

  app.post('/mcp', async (req, res) => {
    try {
      if (!transport) {
        throw new Error('HTTP transport not initialized.');
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('[HTTP] Error handling MCP request:', error);

      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: 'Internal server error',
          },
          id: null,
        });
      }
    }
  });

  app.get('/mcp', async (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      })
    );
  });

  app.delete('/mcp', async (_req, res) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Method not allowed.',
        },
        id: null,
      })
    );
  });

  app.listen(port, host, () => {
    logger.info(`[HTTP] Google Calendar MCP Apps test server listening on http://${host}:${port}/mcp`);
  });
}

async function shutdown(signal: string) {
  logger.info(`[HTTP] Received ${signal}, shutting down...`);

  if (transport) {
    await transport.close();
  }

  if (mcpServer) {
    await mcpServer.cleanup();
  }

  process.exit(0);
}

main().catch((error) => {
  logger.error('[HTTP] Fatal error:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
