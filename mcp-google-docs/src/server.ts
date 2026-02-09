/**
 * Google Docs MCP Server Implementation
 *
 * Provides tools for reading, writing, and editing Google Docs documents.
 * Uses Google Docs API for document operations and Drive API for listing/searching.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';
import { handleGoogleDocsError } from './utils/errors.js';
import type { ServerConfig } from './types/index.js';

// Import tool implementations
import { listDocuments, searchDocuments } from './tools/list.js';
import { createDocument, readDocument } from './tools/document.js';
import { insertText, replaceText, deleteRange } from './tools/edit.js';
import { writeMarkdown, appendMarkdown } from './tools/markdown.js';
import { formatText, formatParagraph } from './tools/format.js';
import { insertTable, insertImage } from './tools/insert.js';

/**
 * Server-level instructions for LLMs
 */
const SERVER_INSTRUCTIONS = `
This is the Google Docs MCP Server, providing tools to read, write, and edit Google Documents.

## Available Tools (13 tools)

### Document Discovery
1. **gdocsListDocuments** - List user's Google Docs documents
2. **gdocsSearchDocuments** - Search documents by content or title

### Document Operations
3. **gdocsCreateDocument** - Create a new Google Doc with optional initial content
4. **gdocsReadDocument** - Read document content (Markdown, text, or JSON format)

### Content Editing
5. **gdocsInsertText** - Insert text at a specific position
6. **gdocsReplaceText** - Find and replace text throughout the document
7. **gdocsDeleteRange** - Delete content in a specific range

### Markdown Support
8. **gdocsWriteMarkdown** - Replace entire document content with Markdown
9. **gdocsAppendMarkdown** - Append Markdown content to the end of the document

### Formatting
10. **gdocsFormatText** - Apply text formatting (bold, italic, font size, color, etc.)
11. **gdocsFormatParagraph** - Apply paragraph formatting (alignment, heading style, spacing)

### Structural Elements
12. **gdocsInsertTable** - Insert a table at a specific position
13. **gdocsInsertImage** - Insert an image from URL at a specific position

## Important Notes

- Document IDs can be found in the URL: docs.google.com/document/d/{documentId}/edit
- Position indices start at 1 (the beginning of the document body)
- Markdown supports headings (#), **bold**, *italic*, ***bold+italic***, ~~strikethrough~~, and bullet lists
- Use gdocsReadDocument with format="json" to see the exact document structure and indices
- Colors should be specified as hex values (e.g., "#FF0000" for red)

## Authentication

This server requires a valid Google OAuth 2.0 access token with the following scopes:
- https://www.googleapis.com/auth/documents (for document operations)
- https://www.googleapis.com/auth/drive.readonly (for listing/searching)

The access token is provided via the accessToken environment variable.
`;

export class MCPServer {
  private server: McpServer;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    logger.info(`[server] Initializing ${config.name} v${config.version}`);

    this.server = new McpServer(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );
  }

  /**
   * Initialize server - register notification handler and tools
   */
  async initialize() {
    logger.info('[server] Initializing Google Docs MCP Server');

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

        // Update environment variable (used by getCurrentToken() in common.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[server] Token update notification handler registered');

    // Register tools
    this.setupTools();

    logger.info('[server] Initialization complete');
  }

  private setupTools() {
    logger.debug('[server] Setting up tools...');

    // ============================================
    // Tool 1: gdocsListDocuments
    // ============================================
    this.server.registerTool(
      'gdocsListDocuments',
      {
        description: `List user's Google Docs documents.

Returns a list of Google Docs with their IDs, names, and metadata.
Use this to discover available documents before reading or editing them.

Parameters:
- maxResults: Maximum number of documents to return (1-100, default: 20)
- pageToken: Token for pagination (from previous response)
- orderBy: Sort order - "modifiedTime", "createdTime", or "name"
- orderDirection: "asc" or "desc" (default: "desc")

Returns:
- documents: Array of document info objects
- count: Number of documents in this page (not total)
- hasMore: Whether more results are available
- nextPageToken: Use this to fetch the next page`,
        inputSchema: {
          maxResults: z.number().int().min(1).max(100).optional().default(20)
            .describe('Maximum number of documents to return (1-100)'),
          pageToken: z.string().optional()
            .describe('Page token for pagination'),
          orderBy: z.enum(['modifiedTime', 'createdTime', 'name']).optional().default('modifiedTime')
            .describe('Field to sort by'),
          orderDirection: z.enum(['asc', 'desc']).optional().default('desc')
            .describe('Sort direction'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsListDocuments');
        try {
          const result = await listDocuments(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsListDocuments');
        }
      }
    );

    // ============================================
    // Tool 2: gdocsSearchDocuments
    // ============================================
    this.server.registerTool(
      'gdocsSearchDocuments',
      {
        description: `Search Google Docs documents by content or title.

Searches the full text of documents including title and body content.

Parameters:
- query: Search query (required) - searches document title and content
- maxResults: Maximum number of results (1-100, default: 20)
- pageToken: Token for pagination
- modifiedAfter: ISO 8601 date to filter by modification time
- createdAfter: ISO 8601 date to filter by creation time
- owner: Email address to filter by document owner
- inFolder: Folder ID to search within

Returns:
- documents: Array of matching document info objects
- count: Number of documents in this page (not total)
- hasMore: Whether more results are available
- nextPageToken: Use this to fetch the next page`,
        inputSchema: {
          query: z.string().min(1).describe('Search query'),
          maxResults: z.number().int().min(1).max(100).optional().default(20)
            .describe('Maximum number of results'),
          pageToken: z.string().optional()
            .describe('Page token for pagination'),
          modifiedAfter: z.string().optional()
            .describe('ISO 8601 date (e.g., "2024-01-01")'),
          createdAfter: z.string().optional()
            .describe('ISO 8601 date (e.g., "2024-01-01")'),
          owner: z.string().email().optional()
            .describe('Filter by owner email'),
          inFolder: z.string().optional()
            .describe('Folder ID to search within'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsSearchDocuments');
        try {
          const result = await searchDocuments(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsSearchDocuments');
        }
      }
    );

    // ============================================
    // Tool 3: gdocsCreateDocument
    // ============================================
    this.server.registerTool(
      'gdocsCreateDocument',
      {
        description: `Create a new Google Docs document.

Creates a new document with the specified title and optional initial content.
The content can be provided as Markdown and will be converted to Google Docs format.

Parameters:
- title: Document title (required)
- content: Initial content in Markdown format (optional)

Returns:
- documentId: The ID of the created document
- title: The document title
- webViewLink: URL to view/edit the document`,
        inputSchema: {
          title: z.string().min(1).max(500).describe('Document title'),
          content: z.string().optional().describe('Initial content (Markdown format)'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsCreateDocument');
        try {
          const result = await createDocument(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsCreateDocument');
        }
      }
    );

    // ============================================
    // Tool 4: gdocsReadDocument
    // ============================================
    this.server.registerTool(
      'gdocsReadDocument',
      {
        description: `Read the content of a Google Docs document.

Retrieves the document content in the specified format.

Parameters:
- documentId: The document ID (required)
- format: Output format - "markdown" (default), "text", or "json"
  - "markdown": Converts to Markdown with headings, bold, italic, links, lists
  - "text": Plain text without formatting
  - "json": Full Google Docs JSON structure (useful for seeing indices)

Returns:
- documentId: The document ID
- title: Document title
- content: Document content in the requested format
- revisionId: Current revision ID`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          format: z.enum(['markdown', 'text', 'json']).optional().default('markdown')
            .describe('Output format'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsReadDocument');
        try {
          const result = await readDocument(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsReadDocument');
        }
      }
    );

    // ============================================
    // Tool 5: gdocsInsertText
    // ============================================
    this.server.registerTool(
      'gdocsInsertText',
      {
        description: `Insert text at a specific position in a Google Docs document.

Inserts plain text at the specified index position.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- text: Text to insert (required)
- index: Position to insert at (required, starts at 1)

Note: Index 1 is the beginning of the document body. Each character and newline counts as 1.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          text: z.string().min(1).describe('Text to insert'),
          index: z.number().int().min(1).describe('Position to insert at (starts at 1)'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsInsertText');
        try {
          const result = await insertText(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsInsertText');
        }
      }
    );

    // ============================================
    // Tool 6: gdocsReplaceText
    // ============================================
    this.server.registerTool(
      'gdocsReplaceText',
      {
        description: `Find and replace all occurrences of text in a Google Docs document.

Replaces all instances of the search text with the replacement text.

Parameters:
- documentId: The document ID (required)
- searchText: Text to find (required)
- replaceText: Replacement text (required, can be empty string to delete)
- matchCase: Whether to match case (default: false)

Returns:
- replacementsCount: Number of replacements made`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          searchText: z.string().min(1).describe('Text to find'),
          replaceText: z.string().describe('Replacement text'),
          matchCase: z.boolean().optional().default(false).describe('Match case sensitivity'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsReplaceText');
        try {
          const result = await replaceText(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsReplaceText');
        }
      }
    );

    // ============================================
    // Tool 7: gdocsDeleteRange
    // ============================================
    this.server.registerTool(
      'gdocsDeleteRange',
      {
        description: `Delete content in a specific range of a Google Docs document.

Deletes all content between startIndex and endIndex.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- startIndex: Start position (required, inclusive, starts at 1)
- endIndex: End position (required, exclusive)

Note: startIndex must be less than endIndex.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          startIndex: z.number().int().min(1).describe('Start position (inclusive)'),
          endIndex: z.number().int().min(2).describe('End position (exclusive)'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsDeleteRange');
        try {
          const result = await deleteRange(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsDeleteRange');
        }
      }
    );

    // ============================================
    // Tool 8: gdocsWriteMarkdown
    // ============================================
    this.server.registerTool(
      'gdocsWriteMarkdown',
      {
        description: `Replace entire document content with Markdown.

Clears the document and writes new content converted from Markdown.
Supports: headings (#), **bold**, *italic*, ~~strikethrough~~, and bullet lists (-).

Parameters:
- documentId: The document ID (required)
- markdown: Markdown content to write (required)

Warning: This replaces ALL existing content in the document.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          markdown: z.string().describe('Markdown content'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsWriteMarkdown');
        try {
          const result = await writeMarkdown(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsWriteMarkdown');
        }
      }
    );

    // ============================================
    // Tool 9: gdocsAppendMarkdown
    // ============================================
    this.server.registerTool(
      'gdocsAppendMarkdown',
      {
        description: `Append Markdown content to the end of a document.

Adds new content at the end of the document, converting from Markdown format.
Supports: headings (#), **bold**, *italic*, ~~strikethrough~~, and bullet lists (-).

Parameters:
- documentId: The document ID (required)
- markdown: Markdown content to append (required)

Note: A newline is automatically added before the appended content if the document is not empty.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          markdown: z.string().min(1).describe('Markdown content to append'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsAppendMarkdown');
        try {
          const result = await appendMarkdown(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsAppendMarkdown');
        }
      }
    );

    // ============================================
    // Tool 10: gdocsFormatText
    // ============================================
    this.server.registerTool(
      'gdocsFormatText',
      {
        description: `Apply text formatting to a range in a Google Docs document.

Applies various text styles to the specified range.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- startIndex: Start position (required, inclusive)
- endIndex: End position (required, exclusive)
- bold: Set bold (true/false)
- italic: Set italic (true/false)
- underline: Set underline (true/false)
- strikethrough: Set strikethrough (true/false)
- fontSize: Font size in points (1-400)
- fontFamily: Font family name (e.g., "Arial", "Times New Roman")
- foregroundColor: Text color as hex (e.g., "#FF0000")
- backgroundColor: Background color as hex (e.g., "#FFFF00")
- link: URL to link the text to

At least one formatting option must be specified.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          startIndex: z.number().int().min(1).describe('Start position (inclusive)'),
          endIndex: z.number().int().min(2).describe('End position (exclusive)'),
          bold: z.boolean().optional().describe('Set bold'),
          italic: z.boolean().optional().describe('Set italic'),
          underline: z.boolean().optional().describe('Set underline'),
          strikethrough: z.boolean().optional().describe('Set strikethrough'),
          fontSize: z.number().min(1).max(400).optional().describe('Font size in points'),
          fontFamily: z.string().optional().describe('Font family name'),
          foregroundColor: z.string().optional().describe('Text color (hex, e.g., "#FF0000")'),
          backgroundColor: z.string().optional().describe('Background color (hex)'),
          link: z.string().url().optional().describe('URL to link to'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsFormatText');
        try {
          const result = await formatText(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsFormatText');
        }
      }
    );

    // ============================================
    // Tool 11: gdocsFormatParagraph
    // ============================================
    this.server.registerTool(
      'gdocsFormatParagraph',
      {
        description: `Apply paragraph formatting to a range in a Google Docs document.

Applies paragraph styles to all paragraphs within the specified range.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- startIndex: Start position (required, inclusive)
- endIndex: End position (required, exclusive)
- alignment: Text alignment - "START" (left), "CENTER", "END" (right), "JUSTIFIED"
- namedStyleType: Heading style - "NORMAL_TEXT", "HEADING_1" through "HEADING_6", "TITLE", "SUBTITLE"
- lineSpacing: Line spacing percentage (100 = single, 200 = double)
- spaceAbove: Space above paragraph in points
- spaceBelow: Space below paragraph in points
- indentFirstLine: First line indent in points
- indentStart: Left indent in points

At least one formatting option must be specified.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          startIndex: z.number().int().min(1).describe('Start position (inclusive)'),
          endIndex: z.number().int().min(2).describe('End position (exclusive)'),
          alignment: z.enum(['START', 'CENTER', 'END', 'JUSTIFIED']).optional()
            .describe('Text alignment'),
          namedStyleType: z.enum([
            'NORMAL_TEXT', 'HEADING_1', 'HEADING_2', 'HEADING_3',
            'HEADING_4', 'HEADING_5', 'HEADING_6', 'TITLE', 'SUBTITLE'
          ]).optional().describe('Heading/paragraph style'),
          lineSpacing: z.number().min(50).max(500).optional()
            .describe('Line spacing percentage (100 = single)'),
          spaceAbove: z.number().min(0).max(500).optional()
            .describe('Space above paragraph in points'),
          spaceBelow: z.number().min(0).max(500).optional()
            .describe('Space below paragraph in points'),
          indentFirstLine: z.number().min(0).max(500).optional()
            .describe('First line indent in points'),
          indentStart: z.number().min(0).max(500).optional()
            .describe('Left indent in points'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsFormatParagraph');
        try {
          const result = await formatParagraph(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsFormatParagraph');
        }
      }
    );

    // ============================================
    // Tool 12: gdocsInsertTable
    // ============================================
    this.server.registerTool(
      'gdocsInsertTable',
      {
        description: `Insert a table at a specific position in a Google Docs document.

Creates an empty table with the specified dimensions.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- index: Position to insert the table (required, starts at 1)
- rows: Number of rows (required, 1-100)
- columns: Number of columns (required, 1-20)

Note: After insertion, you can use gdocsInsertText to add content to table cells.`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          index: z.number().int().min(1).describe('Position to insert table'),
          rows: z.number().int().min(1).max(100).describe('Number of rows (1-100)'),
          columns: z.number().int().min(1).max(20).describe('Number of columns (1-20)'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsInsertTable');
        try {
          const result = await insertTable(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsInsertTable');
        }
      }
    );

    // ============================================
    // Tool 13: gdocsInsertImage
    // ============================================
    this.server.registerTool(
      'gdocsInsertImage',
      {
        description: `Insert an image from URL at a specific position in a Google Docs document.

Inserts an inline image from a publicly accessible URL.
Use gdocsReadDocument with format="json" to find the correct index positions.

Parameters:
- documentId: The document ID (required)
- index: Position to insert the image (required, starts at 1)
- imageUrl: URL of the image (required, must be publicly accessible, http/https)
- width: Image width in points (optional)
- height: Image height in points (optional)

Note: If only width or height is specified, the image will maintain aspect ratio.
The image URL must be publicly accessible (not behind authentication).`,
        inputSchema: {
          documentId: z.string().min(1).describe('The document ID'),
          index: z.number().int().min(1).describe('Position to insert image'),
          imageUrl: z.string().url().describe('URL of the image (must be publicly accessible)'),
          width: z.number().min(1).max(10000).optional().describe('Image width in points'),
          height: z.number().min(1).max(10000).optional().describe('Image height in points'),
        },
      },
      async (params) => {
        logger.info('[tools] Executing tool: gdocsInsertImage');
        try {
          const result = await insertImage(params);
          return {
            content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
          };
        } catch (error) {
          throw handleGoogleDocsError(error, 'gdocsInsertImage');
        }
      }
    );

    logger.info('[tools] All 13 tools registered successfully');
  }

  /**
   * Connect server to transport
   */
  async connect(transport: any) {
    logger.info('[server] Connecting to transport...');

    this.server.server.onerror = (error) => {
      logger.error('[server] Server error:', error);
    };

    try {
      await this.server.connect(transport);
      logger.info(`[server] ${this.config.name} v${this.config.version} connected`);
    } catch (error) {
      logger.error('[server] Failed to connect:', error);
      throw error;
    }
  }
}
