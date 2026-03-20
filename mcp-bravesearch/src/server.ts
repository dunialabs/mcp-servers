import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import { logger } from './utils/logger.js';
import { getServerVersion } from './utils/version.js';
import {
  BraveSearchImageInputSchema,
  BraveSearchLocalInputSchema,
  BraveSearchNewsInputSchema,
  BraveSearchVideoInputSchema,
  BraveSearchWebInputSchema,
  BraveSummarizeByKeyInputSchema,
  braveSearchImage,
  braveSearchLocal,
  braveSearchNews,
  braveSearchVideo,
  braveSearchWeb,
  braveSummarizeByKey,
} from './tools/search.js';

export class BraveSearchMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'bravesearch',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[Server] Initializing BraveSearch MCP Server');

    this.registerTools();
    logger.info('[Server] BraveSearch MCP Server initialized');
  }

  private registerTools() {
    this.server.registerTool(
      'braveSearchWeb',
      {
        title: 'BraveSearch - Web Search',
        description: 'Search the web using Brave Search with filtering and pagination options.',
        inputSchema: BraveSearchWebInputSchema,
      },
      async (params) => braveSearchWeb(params)
    );

    this.server.registerTool(
      'braveSearchLocal',
      {
        title: 'BraveSearch - Local Search',
        description: 'Search local businesses and places using Brave Search local-enriched results.',
        inputSchema: BraveSearchLocalInputSchema,
      },
      async (params) => braveSearchLocal(params)
    );

    this.server.registerTool(
      'braveSearchNews',
      {
        title: 'BraveSearch - News Search',
        description: 'Search news articles using Brave News Search.',
        inputSchema: BraveSearchNewsInputSchema,
      },
      async (params) => braveSearchNews(params)
    );

    this.server.registerTool(
      'braveSearchVideo',
      {
        title: 'BraveSearch - Video Search',
        description: 'Search video results using Brave Video Search.',
        inputSchema: BraveSearchVideoInputSchema,
      },
      async (params) => braveSearchVideo(params)
    );

    this.server.registerTool(
      'braveSearchImage',
      {
        title: 'BraveSearch - Image Search',
        description: 'Search image results using Brave Image Search.',
        inputSchema: BraveSearchImageInputSchema,
      },
      async (params) => braveSearchImage(params)
    );

    this.server.registerTool(
      'braveSummarizeByKey',
      {
        title: 'BraveSearch - Summarize By Key',
        description: 'Get Brave AI summary result by summary key returned from braveSearchWeb.',
        inputSchema: BraveSummarizeByKeyInputSchema,
      },
      async (params) => braveSummarizeByKey(params)
    );

    logger.info('[Server] Registered 6 BraveSearch tools');
  }

  async connect(transport: Transport) {
    await this.server.connect(transport);
  }

  async cleanup() {
    logger.info('[Server] Cleanup completed');
  }
}
