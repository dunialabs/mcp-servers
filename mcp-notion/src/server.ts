/**
 * Notion MCP Server
 * Registers tools for Notion integration
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { getPage, createPage, updatePage, getPageProperties } from './tools/pages.js';
import { getDatabase, queryDatabase, createDatabase, updateDatabase } from './tools/databases.js';
import { getBlockChildren, appendBlocks, getBlock, updateBlock, deleteBlock } from './tools/blocks.js';
import { search } from './tools/search.js';
import { createComment, getComments } from './tools/comments.js';
import { logger } from './utils/logger.js';

/**
 * Tool schemas using Zod
 */

// Page tool schemas
const GetPageParamsSchema = {
  pageId: z.string().min(32).max(36).describe('Page ID (required)'),
};

const CreatePageParamsSchema = {
  parentId: z.string().min(32).max(36).describe('Parent page or database ID (required)'),
  title: z.string().min(1).max(2000).describe('Page title (required, max 2000 chars per Notion API)'),
  properties: z.record(z.any()).optional().describe('Page properties (optional)'),
  children: z.array(z.any()).max(1000).optional().describe('Initial page blocks/content (optional, max 1000 blocks per Notion API)'),
};

const UpdatePageParamsSchema = {
  pageId: z.string().min(32).max(36).describe('Page ID to update (required)'),
  properties: z.record(z.any()).optional().describe('Properties to update (optional)'),
  archived: z.boolean().optional().describe('Archive/unarchive the page (optional)'),
};

const GetPagePropertiesParamsSchema = {
  pageId: z.string().min(32).max(36).describe('Page ID (required)'),
};

// Database tool schemas
const GetDatabaseParamsSchema = {
  databaseId: z.string().min(32).max(36).describe('Database ID (required)'),
};

const QueryDatabaseParamsSchema = {
  databaseId: z.string().min(32).max(36).describe('Database ID to query (required)'),
  filter: z.any().optional().describe('Filter object (optional, Notion API format)'),
  sorts: z.array(z.any()).max(10).optional().describe('Sort array (optional, max 10 sorts, Notion API format)'),
  startCursor: z.string().min(1).max(200).optional().describe('Pagination cursor (optional)'),
  pageSize: z.number().min(1).max(100).optional().describe('Number of results per page (optional, max 100)'),
};

const CreateDatabaseParamsSchema = {
  parentPageId: z.string().min(32).max(36).describe('Parent page ID (required)'),
  title: z.string().min(1).max(2000).describe('Database title (required, max 2000 chars per Notion API)'),
  properties: z.record(z.any()).describe('Database properties schema (required, Notion API format)'),
  description: z.string().max(2000).optional().describe('Database description (optional, max 2000 chars)'),
};

const UpdateDatabaseParamsSchema = {
  databaseId: z.string().min(32).max(36).describe('Database ID to update (required)'),
  title: z.string().min(1).max(2000).optional().describe('New title (optional, max 2000 chars)'),
  properties: z.record(z.any()).optional().describe('Properties to update (optional)'),
  description: z.string().max(2000).optional().describe('New description (optional, max 2000 chars)'),
  archived: z.boolean().optional().describe('Archive/unarchive the database (optional)'),
};

// Block tool schemas
const GetBlockChildrenParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Block/Page ID to get children from (required)'),
  startCursor: z.string().min(1).max(200).optional().describe('Pagination cursor (optional)'),
  pageSize: z.number().min(1).max(100).optional().describe('Number of results per page (optional, max 100)'),
};

const AppendBlocksParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Parent block/page ID (required)'),
  children: z.array(z.any()).min(1).max(1000).describe('Array of block objects to append (required, max 1000 blocks per Notion API)'),
};

const GetBlockParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Block ID (required)'),
};

const UpdateBlockParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Block ID to update (required)'),
  type: z.string().min(1).max(50).describe('Block type (e.g., "paragraph", "heading_1", required)'),
  content: z.any().describe('New block content (required, Notion API format)'),
  archived: z.boolean().optional().describe('Archive/unarchive the block (optional)'),
};

const DeleteBlockParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Block ID to delete (required)'),
};

// Search tool schemas
const SearchParamsSchema = {
  query: z.string().max(1000).optional().describe('Search query text (optional, max 1000 chars, searches all if not provided)'),
  filter: z.object({
    value: z.enum(['page', 'database']).optional(),
    property: z.literal('object').optional(),
  }).catchall(z.unknown()).optional().describe('Filter by object type (optional)'),
  sort: z.object({
    direction: z.enum(['ascending', 'descending']),
    timestamp: z.literal('last_edited_time'),
  }).catchall(z.unknown()).optional().describe('Sort results (optional)'),
  startCursor: z.string().min(1).max(200).optional().describe('Pagination cursor (optional)'),
  pageSize: z.number().min(1).max(100).optional().describe('Number of results per page (optional, max 100)'),
};

// Comment tool schemas
const CreateCommentParamsSchema = {
  pageId: z.string().min(32).max(36).describe('Page ID to comment on (required)'),
  richText: z.array(z.any()).min(1).max(100).describe('Rich text content array (required, max 100 elements per Notion API)'),
  discussionId: z.string().min(32).max(36).optional().describe('Discussion ID to reply to (optional)'),
};

const GetCommentsParamsSchema = {
  blockId: z.string().min(32).max(36).describe('Block or page ID to get comments from (required)'),
  startCursor: z.string().min(1).max(200).optional().describe('Pagination cursor (optional)'),
  pageSize: z.number().min(1).max(100).optional().describe('Number of results per page (optional, max 100)'),
};

/**
 * Notion MCP Server
 */
export class NotionMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'notion',
      version: '1.0.0',
    });
  }

  /**
   * Initialize server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing Notion MCP Server');

    // Register token update notification handler
    // This allows peta-core to update the Notion token without restarting the server
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
        process.env.notionToken = newToken;

        logger.info('[Token] Notion token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register Page Tools
    this.server.registerTool(
      'notionGetPage',
      {
        title: 'Notion - Get Page',
        description: 'Get a Notion page by ID. Returns full page object with properties and metadata.',
        inputSchema: GetPageParamsSchema,
      },
      async (params: any) => {
        return await getPage(params);
      }
    );

    this.server.registerTool(
      'notionCreatePage',
      {
        title: 'Notion - Create Page',
        description: 'Create a new page in Notion. Can be a child of another page or a database entry.',
        inputSchema: CreatePageParamsSchema,
      },
      async (params: any) => {
        return await createPage(params);
      }
    );

    this.server.registerTool(
      'notionUpdatePage',
      {
        title: 'Notion - Update Page',
        description: 'Update page properties or archive/unarchive a page.',
        inputSchema: UpdatePageParamsSchema,
      },
      async (params: any) => {
        return await updatePage(params);
      }
    );

    this.server.registerTool(
      'notionGetPageProperties',
      {
        title: 'Notion - Get Page Properties',
        description: 'Get only the properties of a page (without full metadata).',
        inputSchema: GetPagePropertiesParamsSchema,
      },
      async (params: any) => {
        return await getPageProperties(params);
      }
    );

    // Register Database Tools
    this.server.registerTool(
      'notionGetDatabase',
      {
        title: 'Notion - Get Database',
        description: 'Get database metadata including schema and properties.',
        inputSchema: GetDatabaseParamsSchema,
      },
      async (params: any) => {
        return await getDatabase(params);
      }
    );

    this.server.registerTool(
      'notionQueryDatabase',
      {
        title: 'Notion - Query Database',
        description: 'Query a database with filters and sorting. Returns pages that match the criteria.',
        inputSchema: QueryDatabaseParamsSchema,
      },
      async (params: any) => {
        return await queryDatabase(params);
      }
    );

    this.server.registerTool(
      'notionCreateDatabase',
      {
        title: 'Notion - Create Database',
        description: 'Create a new database as a child of a page.',
        inputSchema: CreateDatabaseParamsSchema,
      },
      async (params: any) => {
        return await createDatabase(params);
      }
    );

    this.server.registerTool(
      'notionUpdateDatabase',
      {
        title: 'Notion - Update Database',
        description: 'Update database title, properties, description, or archive status.',
        inputSchema: UpdateDatabaseParamsSchema,
      },
      async (params: any) => {
        return await updateDatabase(params);
      }
    );

    // Register Block Tools
    this.server.registerTool(
      'notionGetBlockChildren',
      {
        title: 'Notion - Get Block Children',
        description: 'Get children blocks of a page or block. Returns block content.',
        inputSchema: GetBlockChildrenParamsSchema,
      },
      async (params: any) => {
        return await getBlockChildren(params);
      }
    );

    this.server.registerTool(
      'notionAppendBlocks',
      {
        title: 'Notion - Append Blocks',
        description: 'Append new blocks to a page or block. Use this to add content.',
        inputSchema: AppendBlocksParamsSchema,
      },
      async (params: any) => {
        return await appendBlocks(params);
      }
    );

    this.server.registerTool(
      'notionGetBlock',
      {
        title: 'Notion - Get Block',
        description: 'Get a specific block by ID.',
        inputSchema: GetBlockParamsSchema,
      },
      async (params: any) => {
        return await getBlock(params);
      }
    );

    this.server.registerTool(
      'notionUpdateBlock',
      {
        title: 'Notion - Update Block',
        description: 'Update block content or archive/unarchive a block.',
        inputSchema: UpdateBlockParamsSchema,
      },
      async (params: any) => {
        return await updateBlock(params);
      }
    );

    this.server.registerTool(
      'notionDeleteBlock',
      {
        title: 'Notion - Delete Block',
        description: 'Delete (archive) a block by ID.',
        inputSchema: DeleteBlockParamsSchema,
      },
      async (params: any) => {
        return await deleteBlock(params);
      }
    );

    // Register Search Tool
    this.server.registerTool(
      'notionSearch',
      {
        title: 'Notion - Search',
        description: 'Search across all pages and databases in the workspace. Can filter by type and sort results.',
        inputSchema: SearchParamsSchema,
      },
      async (params: any) => {
        return await search(params);
      }
    );

    // Register Comment Tools
    this.server.registerTool(
      'notionCreateComment',
      {
        title: 'Notion - Create Comment',
        description: 'Create a comment on a page or add a reply to an existing discussion thread.',
        inputSchema: CreateCommentParamsSchema,
      },
      async (params: any) => {
        return await createComment(params);
      }
    );

    this.server.registerTool(
      'notionGetComments',
      {
        title: 'Notion - Get Comments',
        description: 'Retrieve all comments from a page or block. Returns discussion threads with replies.',
        inputSchema: GetCommentsParamsSchema,
      },
      async (params: any) => {
        return await getComments(params);
      }
    );

    logger.info('[Server] All tools registered successfully');
  }

  /**
   * Connect to transport
   */
  async connect(transport: any) {
    await this.server.connect(transport);
    logger.info('[Server] Connected to transport');
  }
}
