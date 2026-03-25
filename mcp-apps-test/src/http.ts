#!/usr/bin/env node
import { config } from 'dotenv';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { MCPAppsTestServer } from './server.js';
import { logger } from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
config({ path: path.resolve(__dirname, '..', '.env') });

const host = process.env.HOST ?? '127.0.0.1';
const port = Number(process.env.PORT ?? 3001);
const allowedHosts = process.env.ALLOWED_HOSTS?.split(',')
  .map((value) => value.trim())
  .filter((value) => value.length > 0);

type SessionEntry = {
  server: MCPAppsTestServer;
  transport: StreamableHTTPServerTransport;
};

const sessions = new Map<string, SessionEntry>();

function getHeaderSessionId(req: { headers: Record<string, unknown> }): string | undefined {
  const header = req.headers['mcp-session-id'];
  return typeof header === 'string' && header.length > 0 ? header : undefined;
}

function isInitializeRequest(body: unknown): body is { method: 'initialize' } {
  return !!body && typeof body === 'object' && 'method' in body && (body as { method?: unknown }).method === 'initialize';
}

async function createSessionEntry(): Promise<SessionEntry> {
  const server = new MCPAppsTestServer();
  await server.initialize();

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sessionId) => {
      sessions.set(sessionId, { server, transport });
      logger.info(`[http] Session initialized: ${sessionId}`);
    },
  });

  transport.onclose = async () => {
    const sessionId = transport.sessionId;
    if (sessionId) {
      sessions.delete(sessionId);
      logger.info(`[http] Session closed: ${sessionId}`);
    }
    await server.cleanup();
  };

  await server.connect(transport);
  return { server, transport };
}

async function main() {
  const app = createMcpExpressApp({ host, allowedHosts });
  app.use(cors({ origin: true, methods: ['GET', 'POST', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Accept', 'Mcp-Session-Id', 'Last-Event-ID', 'MCP-Protocol-Version'], exposedHeaders: ['Mcp-Session-Id', 'mcp-session-id'] }));

  app.post('/mcp', async (req, res) => {
    try {
      const sessionId = getHeaderSessionId(req);

      if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
          res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Invalid session ID' }, id: null });
          return;
        }
        await existing.transport.handleRequest(req, res, req.body);
        return;
      }

      if (!isInitializeRequest(req.body)) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Initialization required' }, id: null });
        return;
      }

      const entry = await createSessionEntry();
      await entry.transport.handleRequest(req, res, req.body);
    } catch (error) {
      logger.error('[http] Error handling request', error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  app.get('/mcp', async (req, res) => {
    try {
      const sessionId = getHeaderSessionId(req);
      if (!sessionId) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Missing session ID' }, id: null });
        return;
      }
      const existing = sessions.get(sessionId);
      if (!existing) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Invalid session ID' }, id: null });
        return;
      }
      await existing.transport.handleRequest(req, res);
    } catch (error) {
      logger.error('[http] Error handling request', error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  app.delete('/mcp', async (req, res) => {
    try {
      const sessionId = getHeaderSessionId(req);
      if (!sessionId) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Missing session ID' }, id: null });
        return;
      }
      const existing = sessions.get(sessionId);
      if (!existing) {
        res.status(400).json({ jsonrpc: '2.0', error: { code: -32000, message: 'Bad Request: Invalid session ID' }, id: null });
        return;
      }
      await existing.transport.handleRequest(req, res);
    } catch (error) {
      logger.error('[http] Error handling request', error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: '2.0', error: { code: -32603, message: 'Internal server error' }, id: null });
      }
    }
  });

  app.listen(port, host, () => {
    logger.info(`[http] MCP Apps Test server listening on http://${host}:${port}/mcp`);
  });
}

main().catch((error) => {
  logger.error('[http] Fatal error', error);
  process.exit(1);
});
