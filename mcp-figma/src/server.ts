/**
 * Figma MCP Server
 * Registers tools for Figma integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  registerAppResource,
  registerAppTool,
  RESOURCE_MIME_TYPE,
} from '@modelcontextprotocol/ext-apps/server';
import { z } from 'zod';
import { figmaTestConnection } from './tools/testConnection.js';
import { figmaListFiles } from './tools/listFiles.js';
import { figmaGetFile } from './tools/getFile.js';
import { figmaGetNode } from './tools/getNode.js';
import { figmaGetScreenshot } from './tools/getScreenshot.js';
import { figmaGetMetadata } from './tools/getMetadata.js';
import { figmaGetVersions } from './tools/getVersions.js';
import { figmaListComments } from './tools/listComments.js';
import { figmaCreateComment } from './tools/createComment.js';
import { figmaReplyComment } from './tools/replyComment.js';
import { figmaGetDesignContext } from './tools/getDesignContext.js';
import { figmaGetVariables } from './tools/getVariables.js';
import { figmaGetComponents } from './tools/getComponents.js';
import { figmaGetStyles } from './tools/getStyles.js';
import { figmaListProjects } from './tools/listProjects.js';
import { figmaGetProject } from './tools/getProject.js';
import { figmaGetFigJam } from './tools/getFigJam.js';
import { logger } from './utils/logger.js';
import { getServerVersion } from './utils/version.js';
import { normalizeAccessToken } from './auth/token.js';
import { readAppHtml } from './utils/app-resource.js';

const FIGMA_BROWSER_VIEW_URI = 'ui://figma/browser-view.html';
const FIGMA_NODE_VIEW_URI = 'ui://figma/node-view.html';
const FIGMA_COMPONENT_VIEW_URI = 'ui://figma/component-view.html';

/**
 * Tool schemas using Zod
 */
const ListFilesParamsSchema = {
  project_id: z.string().describe('Figma project ID (required)'),
};

const GetFileParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  version: z.string().optional().describe('File version ID to retrieve (optional)'),
  ids: z.array(z.string()).optional().describe('Array of node IDs to retrieve (optional)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional)'),
  geometry: z.enum(['paths', 'bounds']).optional().describe('Geometry format (optional)'),
  plugin_data: z.string().optional().describe('Plugin ID to retrieve plugin data (optional)'),
  branch_data: z.boolean().optional().describe('Include branch data (optional)'),
};

const GetNodeParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  ids: z.array(z.string()).describe('Array of node IDs to retrieve (required)'),
  version: z.string().optional().describe('File version ID (optional)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional)'),
  geometry: z.enum(['paths', 'bounds']).optional().describe('Geometry format (optional)'),
  plugin_data: z.string().optional().describe('Plugin ID to retrieve plugin data (optional)'),
};

const GetScreenshotParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  ids: z.array(z.string()).describe('Array of node IDs to render (required)'),
  scale: z.number().optional().describe('Image scale (0.01 to 4, default: 1)'),
  format: z.enum(['jpg', 'png', 'svg', 'pdf']).optional().describe('Image format (default: png)'),
  svg_include_id: z.boolean().optional().describe('Include id attributes in SVG (optional)'),
  svg_simplify_stroke: z.boolean().optional().describe('Simplify strokes in SVG (optional)'),
  use_absolute_bounds: z.boolean().optional().describe('Use absolute bounding box (optional)'),
  version: z.string().optional().describe('File version ID (optional)'),
};

const GetMetadataParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  lightweight: z.boolean().optional().describe('Return sparse XML with only basic properties (layer IDs, names, types, positions, sizes). Default: false (returns full JSON)'),
  format: z.enum(['json', 'xml']).optional().describe('Output format: json or xml. Default: json'),
};

const GetFigJamParamsSchema = {
  file_key: z.string().describe('FigJam file key (required)'),
  node_ids: z.array(z.string()).optional().describe('Specific node IDs to retrieve. If not provided, returns all top-level nodes (optional)'),
  include_screenshots: z.boolean().optional().describe('Include screenshot URLs for nodes. Default: true'),
  scale: z.number().optional().describe('Screenshot scale (0.01 to 4). Default: 1'),
};

const GetVersionsParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  page_size: z.number().optional().describe('Number of versions per page (optional, max: 100)'),
};

const ListCommentsParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  as_md: z.boolean().optional().describe('Return comments as markdown (optional)'),
};

const CreateCommentParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  message: z.string().describe('Comment message text (required)'),
  client_meta: z.object({
    x: z.number().optional().describe('X coordinate on the canvas (optional)'),
    y: z.number().optional().describe('Y coordinate on the canvas (optional)'),
    node_id: z.string().optional().describe('Node ID to attach comment to (optional)'),
    node_offset: z.object({
      x: z.number().describe('X offset within node'),
      y: z.number().describe('Y offset within node'),
    }).catchall(z.unknown()).optional().describe('Offset within node (optional)'),
    comment_id: z.string().optional().describe('Parent comment ID for replies (optional)'),
  }).catchall(z.unknown()).optional().describe('Comment position metadata (optional)'),
};

const ReplyCommentParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  comment_id: z.string().describe('Parent comment ID to reply to (required)'),
  message: z.string().describe('Reply message text (required)'),
};

const GetDesignContextParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional, default: 2)'),
};

const GetVariablesParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
};

const GetComponentsParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
};

const GetStylesParamsSchema = {
  file_key: z.string().describe('Figma file key (required)'),
};

const ListProjectsParamsSchema = {
  team_id: z.string().describe('Figma team ID (required)'),
};

const GetProjectParamsSchema = {
  project_id: z.string().describe('Figma project ID (required)'),
};

type ToolTextResult = {
  content: Array<{ type: 'text'; text: string }>;
  [key: string]: unknown;
};

function extractText(result: ToolTextResult): string {
  return result.content.find((item) => item.type === 'text')?.text ?? '{}';
}

function parseToolData(result: ToolTextResult): any {
  const parsed = JSON.parse(extractText(result));
  return parsed?.data ?? parsed?.metadata ?? parsed;
}

function withStructuredContent(
  result: ToolTextResult,
  structuredContent: Record<string, unknown>
) {
  return {
    content: result.content,
    structuredContent,
  };
}

function flattenNode(node: any, depth = 0): any {
  return {
    id: node?.id ?? null,
    name: node?.name ?? 'Untitled node',
    type: node?.type ?? 'NODE',
    depth,
    children: Array.isArray(node?.children) ? node.children.map((child: any) => flattenNode(child, depth + 1)) : [],
  };
}

function summarizeProject(project: any) {
  return {
    id: project?.id ?? null,
    kind: 'project',
    title: project?.name ?? 'Untitled project',
    subtitle: project?.description ?? null,
    description: project?.description ?? null,
    updatedAt: project?.updated_at ?? project?.modified_at ?? null,
    badges: [
      project?.team_name ? `Team: ${project.team_name}` : null,
      typeof project?.file_count === 'number' ? `Files: ${project.file_count}` : null,
    ].filter(Boolean),
    links: [],
  };
}

function summarizeFile(file: any) {
  return {
    id: file?.key ?? file?.id ?? null,
    kind: 'file',
    title: file?.name ?? 'Untitled file',
    subtitle: file?.last_modified ?? file?.updated_at ?? null,
    description: file?.description ?? null,
    thumbnailUrl: file?.thumbnail_url ?? file?.thumbnailUrl ?? null,
    updatedAt: file?.last_modified ?? file?.updated_at ?? null,
    badges: [
      file?.role ? `Role: ${file.role}` : null,
      file?.branch_data?.mainFileKey ? 'Branch' : null,
    ].filter(Boolean),
    links: file?.key
      ? [{ label: 'Open in Figma', url: `https://www.figma.com/file/${file.key}` }]
      : [],
  };
}

function summarizeProjectDetail(project: any) {
  return {
    kind: 'figma-project-detail',
    title: project?.name ?? 'Project',
    subtitle: project?.description ?? 'Project file browser',
    count: Array.isArray(project?.files) ? project.files.length : 0,
    items: (project?.files ?? []).map((file: any) => summarizeFile(file)),
  };
}

function summarizeFileDetail(data: any) {
  const documentNode = data?.document ? flattenNode(data.document) : null;
  return {
    kind: 'figma-file-detail',
    title: data?.name ?? 'Figma file',
    subtitle: 'File structure and metadata panel',
    badges: [
      data?.editorType ? `Editor: ${data.editorType}` : null,
      data?.version ? `Version: ${data.version}` : null,
      data?.role ? `Role: ${data.role}` : null,
    ].filter(Boolean),
    meta: [
      { label: 'File Key', value: data?.key ?? '—' },
      { label: 'Last Modified', value: data?.lastModified ?? '—' },
      { label: 'Link Access', value: data?.linkAccess ?? '—' },
    ],
    tree: documentNode ? [documentNode] : [],
  };
}

function summarizeNodeDetail(data: any) {
  const nodes = Object.values(data?.nodes ?? {}) as any[];
  const tree = nodes
    .map((entry) => (entry?.document ? flattenNode(entry.document) : null))
    .filter(Boolean);

  return {
    kind: 'figma-node-detail',
    title: nodes[0]?.document?.name ?? 'Selected nodes',
    subtitle: 'Node tree and metadata panel',
    badges: [`Nodes: ${nodes.length}`],
    meta: [
      { label: 'File Key', value: data?.file_key ?? '—' },
      { label: 'Selected IDs', value: Object.keys(data?.nodes ?? {}).join(', ') || '—' },
    ],
    tree,
  };
}

function summarizeMetadataView(data: any) {
  return {
    kind: 'figma-file-metadata',
    title: data?.name ?? 'Figma metadata',
    subtitle: 'Simplified file metadata',
    badges: [
      data?.editorType ? `Editor: ${data.editorType}` : null,
      data?.version ? `Version: ${data.version}` : null,
    ].filter(Boolean),
    meta: [
      { label: 'Last Modified', value: data?.lastModified ?? '—' },
      { label: 'Role', value: data?.role ?? '—' },
      { label: 'Link Access', value: data?.linkAccess ?? '—' },
      { label: 'Thumbnail', value: data?.thumbnailUrl ?? '—' },
    ],
    tree: [],
  };
}

function summarizeComponents(data: any, fileKey: string) {
  const components = Object.values(data?.meta?.components ?? {}) as any[];
  const componentSets = data?.meta?.component_sets ?? {};
  return {
    kind: 'figma-component-summary',
    title: 'Components',
    subtitle: 'Component preview summary',
    badges: [
      `Components: ${components.length}`,
      `Sets: ${Object.keys(componentSets).length}`,
    ],
    items: components.map((component) => ({
      id: component?.node_id ?? component?.key ?? null,
      name: component?.name ?? 'Untitled component',
      description: component?.description ?? null,
      key: component?.key ?? null,
      containingFrame: component?.containing_frame?.name ?? null,
      setName: component?.component_set_id ? componentSets[component.component_set_id]?.name ?? null : null,
      fileKey,
    })),
  };
}

/**
 * Figma MCP Server
 */
export class FigmaMcpServer {
  private server: McpServer;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.server = new McpServer({
      name: 'figma',
      version: getServerVersion(),
    });

    // Initialize tool handlers map
    this.toolHandlers = new Map<string, (args: any) => Promise<any>>([
      ['figmaListFiles', figmaListFiles as (args: any) => Promise<any>],
      ['figmaGetFile', figmaGetFile as (args: any) => Promise<any>],
      ['figmaGetNode', figmaGetNode as (args: any) => Promise<any>],
      ['figmaGetScreenshot', figmaGetScreenshot as (args: any) => Promise<any>],
      ['figmaGetMetadata', figmaGetMetadata as (args: any) => Promise<any>],
      ['figmaGetFigJam', figmaGetFigJam as (args: any) => Promise<any>],
      ['figmaGetVersions', figmaGetVersions as (args: any) => Promise<any>],
      ['figmaListComments', figmaListComments as (args: any) => Promise<any>],
      ['figmaCreateComment', figmaCreateComment as (args: any) => Promise<any>],
      ['figmaReplyComment', figmaReplyComment as (args: any) => Promise<any>],
      ['figmaGetDesignContext', figmaGetDesignContext as (args: any) => Promise<any>],
      ['figmaGetVariables', figmaGetVariables as (args: any) => Promise<any>],
      ['figmaGetComponents', figmaGetComponents as (args: any) => Promise<any>],
      ['figmaGetStyles', figmaGetStyles as (args: any) => Promise<any>],
      ['figmaListProjects', figmaListProjects as (args: any) => Promise<any>],
      ['figmaGetProject', figmaGetProject as (args: any) => Promise<any>],
    ]);
  }

  /**
   * Initialize server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing Figma MCP Server');

    // Register token update notification handler
    // This allows peta-core to update the access token without restarting the server
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string().optional(),
        accessToken: z.string().optional(),
        timestamp: z.number().optional()
      }).catchall(z.unknown())
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const rawToken = notification.params.accessToken ?? notification.params.token;
        const timestamp = notification.params.timestamp;
        const newToken = rawToken ? normalizeAccessToken(rawToken) : '';

        // Validate token format
        if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
          logger.error('[Token] Invalid token received in notification');
          return;
        }

        // Update environment variable (used by getCurrentToken() in token.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    this.registerAppResources();

    // Register tools in order

    // Tool 0: Test Connection
    this.server.registerTool(
      'figmaTestConnection',
      {
        title: 'Figma - Test Connection',
        description: 'Test Figma API connection and verify authentication. Returns current user information if successful. Use this to diagnose connection issues or verify token validity.',
        inputSchema: {},
      },
      async (params: any) => {
        return await figmaTestConnection(params);
      }
    );

    // Tool 1: List Files
    registerAppTool(
      this.server,
      'figmaListFiles',
      {
        title: 'Figma - List Files',
        description: 'List all files in a Figma project. Returns file metadata including name, key, thumbnail, and last modified date.',
        _meta: {
          ui: {
            resourceUri: FIGMA_BROWSER_VIEW_URI,
          },
        },
        inputSchema: ListFilesParamsSchema,
      },
      async (params: any) => {
        const result = await figmaListFiles(params);
        const data = parseToolData(result);
        return withStructuredContent(result, {
          kind: 'figma-file-list',
          title: 'Project Files',
          subtitle: 'Browse files inside this Figma project.',
          count: data?.files?.length ?? 0,
          items: (data?.files ?? []).map((file: any) => summarizeFile(file)),
        });
      }
    );

    // Tool 2: Get File
    registerAppTool(
      this.server,
      'figmaGetFile',
      {
        title: 'Figma - Get File',
        description: 'Get the full document structure of a Figma file. Returns complete node hierarchy with all design elements, frames, layers, and properties.',
        _meta: {
          ui: {
            resourceUri: FIGMA_NODE_VIEW_URI,
          },
        },
        inputSchema: GetFileParamsSchema,
      },
      async (params: any) => {
        const result = await figmaGetFile(params);
        const data = parseToolData(result);
        return withStructuredContent(result, summarizeFileDetail({ ...data, key: params.file_key }));
      }
    );

    // Tool 3: Get Node
    registerAppTool(
      this.server,
      'figmaGetNode',
      {
        title: 'Figma - Get Node',
        description: 'Get specific nodes from a Figma file by their IDs. Useful for retrieving individual frames, components, or design elements.',
        _meta: {
          ui: {
            resourceUri: FIGMA_NODE_VIEW_URI,
          },
        },
        inputSchema: GetNodeParamsSchema,
      },
      async (params: any) => {
        const result = await figmaGetNode(params);
        const data = parseToolData(result);
        return withStructuredContent(result, summarizeNodeDetail({ ...data, file_key: params.file_key }));
      }
    );

    // Tool 4: Get Screenshot
    this.server.registerTool(
      'figmaGetScreenshot',
      {
        title: 'Figma - Get Screenshot',
        description: 'Get rendered images (screenshots) of Figma nodes. Returns image URLs for specified nodes in various formats (PNG, JPG, SVG, PDF).',
        inputSchema: GetScreenshotParamsSchema,
      },
      async (params: any) => {
        return await figmaGetScreenshot(params);
      }
    );

    // Tool 5: Get Metadata
    registerAppTool(
      this.server,
      'figmaGetMetadata',
      {
        title: 'Figma - Get Metadata',
        description: 'Get simplified metadata for a Figma file. Supports JSON (default) and lightweight XML format with basic properties (layer IDs, names, types, positions, sizes).',
        _meta: {
          ui: {
            resourceUri: FIGMA_NODE_VIEW_URI,
          },
        },
        inputSchema: GetMetadataParamsSchema,
      },
      async (params: any) => {
        const result = await figmaGetMetadata(params);
        const data = parseToolData(result);
        return withStructuredContent(result, summarizeMetadataView(data));
      }
    );

    // Tool 6: Get FigJam
    this.server.registerTool(
      'figmaGetFigJam',
      {
        title: 'Figma - Get FigJam',
        description: 'Get FigJam diagram content in XML format with screenshots. Returns metadata for FigJam diagrams including layer IDs, names, types, positions, sizes, and optional screenshot URLs. Useful for accessing workflow diagrams and collaborative boards.',
        inputSchema: GetFigJamParamsSchema,
      },
      async (params: any) => {
        return await figmaGetFigJam(params);
      }
    );

    // Tool 7: Get Versions
    this.server.registerTool(
      'figmaGetVersions',
      {
        title: 'Figma - Get Versions',
        description: 'Get version history of a Figma file. Returns a list of saved versions with timestamps, descriptions, and author information.',
        inputSchema: GetVersionsParamsSchema,
      },
      async (params: any) => {
        return await figmaGetVersions(params);
      }
    );

    // Tool 8: List Comments
    this.server.registerTool(
      'figmaListComments',
      {
        title: 'Figma - List Comments',
        description: 'List all comments in a Figma file. Returns comments with author information, timestamps, messages, and thread structure.',
        inputSchema: ListCommentsParamsSchema,
      },
      async (params: any) => {
        return await figmaListComments(params);
      }
    );

    // Tool 9: Create Comment
    this.server.registerTool(
      'figmaCreateComment',
      {
        title: 'Figma - Create Comment',
        description: 'Create a new comment in a Figma file. Can attach to specific nodes or canvas positions. Supports comment threads.',
        inputSchema: CreateCommentParamsSchema,
      },
      async (params: any) => {
        return await figmaCreateComment(params);
      }
    );

    // Tool 10: Reply Comment
    this.server.registerTool(
      'figmaReplyComment',
      {
        title: 'Figma - Reply Comment',
        description: 'Reply to an existing comment in a Figma file. Creates a threaded conversation under the parent comment.',
        inputSchema: ReplyCommentParamsSchema,
      },
      async (params: any) => {
        return await figmaReplyComment(params);
      }
    );

    // Tool 11: Get Design Context
    this.server.registerTool(
      'figmaGetDesignContext',
      {
        title: 'Figma - Get Design Context',
        description: 'Get comprehensive design context including file structure, variables, components, and styles. Useful for understanding the complete design system.',
        inputSchema: GetDesignContextParamsSchema,
      },
      async (params: any) => {
        return await figmaGetDesignContext(params);
      }
    );

    // Tool 12: Get Variables
    this.server.registerTool(
      'figmaGetVariables',
      {
        title: 'Figma - Get Variables',
        description: 'Get local variables and variable collections from a Figma file. Returns design tokens including colors, numbers, strings, and booleans.',
        inputSchema: GetVariablesParamsSchema,
      },
      async (params: any) => {
        return await figmaGetVariables(params);
      }
    );

    // Tool 13: Get Components
    registerAppTool(
      this.server,
      'figmaGetComponents',
      {
        title: 'Figma - Get Components',
        description: 'Get components and component sets from a Figma file. Returns reusable design components with their properties and variants.',
        _meta: {
          ui: {
            resourceUri: FIGMA_COMPONENT_VIEW_URI,
          },
        },
        inputSchema: GetComponentsParamsSchema,
      },
      async (params: any) => {
        const result = await figmaGetComponents(params);
        const data = parseToolData(result);
        return withStructuredContent(result, summarizeComponents(data, params.file_key));
      }
    );

    // Tool 14: Get Styles
    this.server.registerTool(
      'figmaGetStyles',
      {
        title: 'Figma - Get Styles',
        description: 'Get styles (text, color, effect, grid) from a Figma file. Returns shared design styles used across the project.',
        inputSchema: GetStylesParamsSchema,
      },
      async (params: any) => {
        return await figmaGetStyles(params);
      }
    );

    // Tool 15: List Projects
    registerAppTool(
      this.server,
      'figmaListProjects',
      {
        title: 'Figma - List Projects',
        description: 'List all projects in a Figma team. Returns project metadata including name, ID, and file count.',
        _meta: {
          ui: {
            resourceUri: FIGMA_BROWSER_VIEW_URI,
          },
        },
        inputSchema: ListProjectsParamsSchema,
      },
      async (params: any) => {
        const result = await figmaListProjects(params);
        const data = parseToolData(result);
        return withStructuredContent(result, {
          kind: 'figma-project-list',
          title: 'Team Projects',
          subtitle: 'Browse projects available in this Figma team.',
          count: data?.projects?.length ?? 0,
          items: (data?.projects ?? []).map((project: any) => summarizeProject(project)),
        });
      }
    );

    // Tool 16: Get Project
    registerAppTool(
      this.server,
      'figmaGetProject',
      {
        title: 'Figma - Get Project',
        description: 'Get details of a specific Figma project including name, description, and contained files.',
        _meta: {
          ui: {
            resourceUri: FIGMA_BROWSER_VIEW_URI,
          },
        },
        inputSchema: GetProjectParamsSchema,
      },
      async (params: any) => {
        const result = await figmaGetProject(params);
        const data = parseToolData(result);
        return withStructuredContent(result, summarizeProjectDetail(data));
      }
    );

    logger.info('[Server] Registered 17 tools');
  }

  private registerAppResources() {
    registerAppResource(this.server, 'figma-browser-view', FIGMA_BROWSER_VIEW_URI, {}, async () => ({
      contents: [
        {
          uri: FIGMA_BROWSER_VIEW_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readAppHtml('figma-browser-view.html'),
        },
      ],
    }));

    registerAppResource(this.server, 'figma-node-view', FIGMA_NODE_VIEW_URI, {}, async () => ({
      contents: [
        {
          uri: FIGMA_NODE_VIEW_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readAppHtml('figma-node-view.html'),
        },
      ],
    }));

    registerAppResource(this.server, 'figma-component-view', FIGMA_COMPONENT_VIEW_URI, {}, async () => ({
      contents: [
        {
          uri: FIGMA_COMPONENT_VIEW_URI,
          mimeType: RESOURCE_MIME_TYPE,
          text: await readAppHtml('figma-component-view.html'),
        },
      ],
    }));
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }

  /**
   * Connect to transport
   */
  async connect(transport: any) {
    await this.server.connect(transport);
    logger.info('[Server] Connected to transport');
  }

  /**
   * Call a tool directly (for REST API mode)
   */
  async callTool(toolName: string, args: any) {
    logger.debug(`[Server] Calling tool: ${toolName}`);

    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await handler(args);
  }

  /**
   * Cleanup resources on server shutdown
   */
  async cleanup() {
    logger.info('[Server] Cleaning up resources...');
    logger.info('[Server] Cleanup complete');
  }
}
