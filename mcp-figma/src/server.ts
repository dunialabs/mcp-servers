/**
 * Figma MCP Server
 * Registers tools for Figma integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
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

/**
 * Figma MCP Server
 */
export class FigmaMcpServer {
  private server: McpServer;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;

  constructor() {
    this.server = new McpServer({
      name: 'figma',
      version: '1.0.0',
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
        token: z.string(),
        timestamp: z.number().optional()
      }).catchall(z.unknown())
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const { token: newToken, timestamp } = notification.params;

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
    this.server.registerTool(
      'figmaListFiles',
      {
        title: 'Figma - List Files',
        description: 'List all files in a Figma project. Returns file metadata including name, key, thumbnail, and last modified date.',
        inputSchema: ListFilesParamsSchema,
      },
      async (params: any) => {
        return await figmaListFiles(params);
      }
    );

    // Tool 2: Get File
    this.server.registerTool(
      'figmaGetFile',
      {
        title: 'Figma - Get File',
        description: 'Get the full document structure of a Figma file. Returns complete node hierarchy with all design elements, frames, layers, and properties.',
        inputSchema: GetFileParamsSchema,
      },
      async (params: any) => {
        return await figmaGetFile(params);
      }
    );

    // Tool 3: Get Node
    this.server.registerTool(
      'figmaGetNode',
      {
        title: 'Figma - Get Node',
        description: 'Get specific nodes from a Figma file by their IDs. Useful for retrieving individual frames, components, or design elements.',
        inputSchema: GetNodeParamsSchema,
      },
      async (params: any) => {
        return await figmaGetNode(params);
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
    this.server.registerTool(
      'figmaGetMetadata',
      {
        title: 'Figma - Get Metadata',
        description: 'Get simplified metadata for a Figma file. Supports JSON (default) and lightweight XML format with basic properties (layer IDs, names, types, positions, sizes).',
        inputSchema: GetMetadataParamsSchema,
      },
      async (params: any) => {
        return await figmaGetMetadata(params);
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
    this.server.registerTool(
      'figmaGetComponents',
      {
        title: 'Figma - Get Components',
        description: 'Get components and component sets from a Figma file. Returns reusable design components with their properties and variants.',
        inputSchema: GetComponentsParamsSchema,
      },
      async (params: any) => {
        return await figmaGetComponents(params);
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
    this.server.registerTool(
      'figmaListProjects',
      {
        title: 'Figma - List Projects',
        description: 'List all projects in a Figma team. Returns project metadata including name, ID, and file count.',
        inputSchema: ListProjectsParamsSchema,
      },
      async (params: any) => {
        return await figmaListProjects(params);
      }
    );

    // Tool 16: Get Project
    this.server.registerTool(
      'figmaGetProject',
      {
        title: 'Figma - Get Project',
        description: 'Get details of a specific Figma project including name, description, and contained files.',
        inputSchema: GetProjectParamsSchema,
      },
      async (params: any) => {
        return await figmaGetProject(params);
      }
    );

    logger.info('[Server] Registered 17 tools');
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
