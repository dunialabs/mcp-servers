/**
 * Notion Page Tools
 * Operations for creating, reading, updating pages
 */

import { getNotionClient, withRetry } from '../api/notion-client.js';
import { handleNotionError, validatePageIdOrThrow } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Get page by ID with full metadata and properties
 *
 * Retrieves a complete Notion page object including all properties, metadata,
 * and configuration. Uses automatic retry for transient network errors.
 *
 * @param params - Function parameters
 * @param params.pageId - The UUID of the Notion page (with or without hyphens)
 * @returns Promise resolving to MCP tool response with page data as JSON
 * @throws {McpError} PageNotFound (404) - Page doesn't exist or integration lacks access
 * @throws {McpError} PermissionDenied (403) - Integration not shared with this page
 * @throws {McpError} AuthenticationFailed (401) - Invalid or expired token
 * @throws {McpError} RateLimitExceeded (429) - Too many requests (automatically retried)
 *
 * @example
 * ```typescript
 * const result = await getPage({
 *   pageId: "123e4567-e89b-12d3-a456-426614174000"
 * });
 * ```
 */
export async function getPage(params: { pageId: string }) {
  try {
    validatePageIdOrThrow(params.pageId);

    const notion = getNotionClient();
    const page = await withRetry(() => notion.pages.retrieve({ page_id: params.pageId }));

    logger.info('Retrieved page', { pageId: params.pageId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(page, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'getPage');
  }
}

/**
 * Create a new page in Notion
 *
 * Creates a page either as a child of another page or as an entry in a database.
 * Automatically detects parent type (page vs database) by attempting database retrieval.
 *
 * @param params - Function parameters
 * @param params.parentId - Parent page or database UUID
 * @param params.title - Page title (used for title property)
 * @param params.properties - Optional page properties (Notion API format)
 * @param params.children - Optional initial content blocks (Notion API format)
 * @returns Promise resolving to MCP tool response with created page data
 * @throws {McpError} PageNotFound (404) - Parent doesn't exist
 * @throws {McpError} PermissionDenied (403) - Integration not shared with parent
 * @throws {McpError} InvalidParams (400) - Invalid property or block format
 *
 * @example
 * ```typescript
 * // Create page in database
 * await createPage({
 *   parentId: "database-uuid",
 *   title: "New Task",
 *   properties: { Status: { select: { name: "In Progress" } } }
 * });
 *
 * // Create sub-page with content
 * await createPage({
 *   parentId: "page-uuid",
 *   title: "Notes",
 *   children: [{ type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Hello" } }] } }]
 * });
 * ```
 */
export async function createPage(params: {
  parentId: string;
  title: string;
  properties?: Record<string, any>;
  children?: any[];
}) {
  try {
    const notion = getNotionClient();

    // Try to determine parent type by checking if it's a database first
    // This is more reliable than guessing based on ID format
    let parent: any;
    let properties: any;

    try {
      // First, try to get it as a database
      await notion.databases.retrieve({ database_id: params.parentId });

      // If successful, it's a database - use database parent format
      parent = { database_id: params.parentId };
      properties = {
        title: {
          title: [
            {
              text: {
                content: params.title,
              },
            },
          ],
        },
        ...(params.properties || {}),
      };
    } catch (error: any) {
      // If database retrieve fails, assume it's a page
      parent = { page_id: params.parentId };

      // For page parent, properties structure may be different
      // Use custom properties if provided, otherwise simple title
      properties = params.properties || {
        title: {
          title: [
            {
              text: {
                content: params.title,
              },
            },
          ],
        },
      };
    }

    // Create page
    const page = await notion.pages.create({
      parent,
      properties,
      children: params.children || [],
    });

    logger.info('Created page', { pageId: page.id, title: params.title });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(page, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'createPage');
  }
}

/**
 * Update page properties or archive status
 *
 * Modifies existing page properties or archives/unarchives the page.
 * Only provided properties will be updated; others remain unchanged.
 *
 * @param params - Function parameters
 * @param params.pageId - UUID of the page to update
 * @param params.properties - Optional properties to update (Notion API format)
 * @param params.archived - Optional flag to archive (true) or unarchive (false)
 * @returns Promise resolving to MCP tool response with updated page data
 * @throws {McpError} PageNotFound (404) - Page doesn't exist
 * @throws {McpError} PermissionDenied (403) - Integration lacks edit permissions
 * @throws {McpError} InvalidParams (400) - Invalid property format
 */
export async function updatePage(params: {
  pageId: string;
  properties?: Record<string, any>;
  archived?: boolean;
}) {
  try {
    validatePageIdOrThrow(params.pageId);

    const notion = getNotionClient();
    const updateData: any = {
      page_id: params.pageId,
    };

    if (params.properties) {
      updateData.properties = params.properties;
    }

    if (params.archived !== undefined) {
      updateData.archived = params.archived;
    }

    const page = await notion.pages.update(updateData);

    logger.info('Updated page', { pageId: params.pageId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(page, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'updatePage');
  }
}

/**
 * Get only the properties of a page (lighter than full page retrieval)
 *
 * Retrieves just the page properties without full metadata, useful for faster
 * property-only queries. Uses automatic retry for transient network errors.
 *
 * @param params - Function parameters
 * @param params.pageId - UUID of the page
 * @returns Promise resolving to MCP tool response with page properties as JSON
 * @throws {McpError} PageNotFound (404) - Page doesn't exist
 * @throws {McpError} PermissionDenied (403) - Integration not shared with page
 * @throws {McpError} RateLimitExceeded (429) - Too many requests (automatically retried)
 */
export async function getPageProperties(params: { pageId: string }) {
  try {
    validatePageIdOrThrow(params.pageId);

    const notion = getNotionClient();
    const page = await withRetry(() => notion.pages.retrieve({ page_id: params.pageId }));

    logger.info('Retrieved page properties', { pageId: params.pageId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify((page as any).properties, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'getPageProperties');
  }
}
