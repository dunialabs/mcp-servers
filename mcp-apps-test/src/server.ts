import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from '@modelcontextprotocol/ext-apps/server';
import { playgroundListCards, ListCardsInputSchema } from './tools/listCards.js';
import { playgroundTimeline, TimelineInputSchema } from './tools/timeline.js';
import { readAppHtml } from './utils/app-resource.js';
import { logger } from './utils/logger.js';
import { getServerVersion } from './utils/version.js';

const PLAYGROUND_VIEW_URI = 'ui://apps-test/playground-view.html';

export class MCPAppsTestServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'apps-test',
      version: getServerVersion(),
    });
  }

  async initialize() {
    logger.info('[server] Initializing MCP Apps Test server');

    registerAppTool(
      this.server,
      'playgroundListCards',
      {
        title: 'Playground - List Cards',
        description: 'Generate mock card data and render it in an interactive card board view.',
        inputSchema: ListCardsInputSchema,
        _meta: { ui: { resourceUri: PLAYGROUND_VIEW_URI } },
      },
      async (params) => playgroundListCards(params)
    );

    registerAppTool(
      this.server,
      'playgroundTimeline',
      {
        title: 'Playground - Timeline',
        description: 'Generate mock timeline data and render it in an interactive agenda-style view.',
        inputSchema: TimelineInputSchema,
        _meta: { ui: { resourceUri: PLAYGROUND_VIEW_URI } },
      },
      async (params) => playgroundTimeline(params)
    );

    registerAppResource(
      this.server,
      'Playground View',
      PLAYGROUND_VIEW_URI,
      { title: 'Playground View', description: 'Shared interactive view for MCP Apps test tools.' },
      async () => ({
        contents: [{ uri: PLAYGROUND_VIEW_URI, mimeType: RESOURCE_MIME_TYPE, text: await readAppHtml('playground-view.html') }],
      })
    );

    logger.info('[server] Registered 2 tools and 1 MCP App resource');
  }

  getServer(): McpServer {
    return this.server;
  }

  async connect(transport: Parameters<McpServer['connect']>[0]) {
    await this.server.connect(transport);
    logger.info('[server] Connected to transport');
  }

  async cleanup() {
    logger.info('[server] Cleanup complete');
  }
}
