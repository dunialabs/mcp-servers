import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { logger } from './utils/logger.js';
import { getServerVersion } from './utils/version.js';
import { readAppHtml } from './utils/app-resource.js';
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


const BRAVE_WEB_VIEW_URI = 'ui://bravesearch/web-view.html';
const BRAVE_NEWS_VIEW_URI = 'ui://bravesearch/news-view.html';

type ToolTextResult = {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
};

function extractJson(result: ToolTextResult): Record<string, unknown> {
  try {
    return JSON.parse(result.content.find((c) => c.type === 'text')?.text ?? '{}') as Record<string, unknown>;
  } catch {
    return {};
  }
}

function withStructuredContent(
  result: ToolTextResult,
  structuredContent: Record<string, unknown>
) {
  return { content: result.content, structuredContent };
}

function toStr(v: unknown): string | null {
  return v != null ? String(v) : null;
}

function toNum(v: unknown): number | null {
  return typeof v === 'number' ? v : null;
}


function buildWebStructured(data: Record<string, unknown>, query: string) {
  const webResults = Array.isArray(data.webResults) ? data.webResults as Record<string, unknown>[] : [];
  const newsResults = Array.isArray(data.newsResults) ? data.newsResults as Record<string, unknown>[] : [];
  return {
    kind: 'brave-web-results',
    query,
    count: toNum(data.count) ?? webResults.length,
    items: webResults.map((item) => ({
      title: toStr(item.title),
      url: toStr(item.url),
      description: toStr(item.description),
      age: toStr(item.age),
    })),
    newsItems: newsResults.map((item) => ({
      title: toStr(item.title),
      url: toStr(item.url),
      description: toStr(item.description),
      age: toStr(item.age),
      source: toStr((item.source as Record<string, unknown>)?.netloc ?? item.source),
    })),
  };
}

function buildNewsStructured(data: Record<string, unknown>, query: string) {
  const results = Array.isArray(data.results) ? data.results as Record<string, unknown>[] : [];
  return {
    kind: 'brave-news-results',
    query,
    count: toNum(data.count) ?? results.length,
    items: results.map((item) => ({
      title: toStr(item.title),
      url: toStr(item.url),
      description: toStr(item.description),
      age: toStr(item.age),
      pageAge: toStr(item.pageAge),
      source: toStr((item.source as Record<string, unknown>)?.netloc ?? item.source),
    })),
  };
}


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

    this.registerAppResources();
    this.registerTools();

    logger.info('[Server] BraveSearch MCP Server initialized');
  }

  private registerAppResources() {
    registerAppResource(this.server, 'brave-web-view', BRAVE_WEB_VIEW_URI, {}, async () => ({
      contents: [{ uri: BRAVE_WEB_VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: await readAppHtml('brave-web-view.html') }],
    }));

    registerAppResource(this.server, 'brave-news-view', BRAVE_NEWS_VIEW_URI, {}, async () => ({
      contents: [{ uri: BRAVE_NEWS_VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: await readAppHtml('brave-news-view.html') }],
    }));
  }

  private registerTools() {
    registerAppTool(
      this.server,
      'braveSearchWeb',
      {
        title: 'BraveSearch - Web Search',
        description: 'Search the web using Brave Search with filtering and pagination options.',
        _meta: { ui: { resourceUri: BRAVE_WEB_VIEW_URI } },
        inputSchema: BraveSearchWebInputSchema,
      },
      async (params) => {
        const result = await braveSearchWeb(params) as ToolTextResult;
        return withStructuredContent(result, buildWebStructured(extractJson(result), params.query));
      }
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

    registerAppTool(
      this.server,
      'braveSearchNews',
      {
        title: 'BraveSearch - News Search',
        description: 'Search news articles using Brave News Search.',
        _meta: { ui: { resourceUri: BRAVE_NEWS_VIEW_URI } },
        inputSchema: BraveSearchNewsInputSchema,
      },
      async (params) => {
        const result = await braveSearchNews(params) as ToolTextResult;
        return withStructuredContent(result, buildNewsStructured(extractJson(result), params.query));
      }
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
