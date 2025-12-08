/**
 * Notion Search Tools
 * Search across pages and databases
 */

import { getNotionClient, withRetry } from '../api/notion-client.js';
import { handleNotionError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Searches across the entire Notion workspace for pages and databases
 *
 * Performs a full-text search across all accessible pages and databases in the workspace.
 * Can filter by object type (page or database), sort by last edited time, and supports
 * pagination for large result sets. Empty query returns all accessible content.
 *
 * @param params - Function parameters
 * @param params.query - Optional search query text (empty returns all accessible content)
 * @param params.filter - Optional filter to restrict results by object type
 * @param params.filter.value - Object type to filter by: 'page' or 'database'
 * @param params.filter.property - Property to filter on (typically 'object')
 * @param params.sort - Optional sort configuration
 * @param params.sort.direction - Sort direction: 'ascending' or 'descending'
 * @param params.sort.timestamp - Timestamp field to sort by (currently only 'last_edited_time')
 * @param params.startCursor - Optional cursor for pagination continuation
 * @param params.pageSize - Optional page size (max 100, automatically capped)
 * @returns Promise resolving to MCP tool response containing search results array and pagination info
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks search permissions
 * @throws {McpError} BAD_REQUEST (400) - When filter or sort parameters are malformed
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await search({
 *   query: "project documentation",
 *   filter: { property: "object", value: "page" },
 *   sort: { direction: "descending", timestamp: "last_edited_time" },
 *   pageSize: 25
 * });
 * ```
 */
export async function search(params: {
  query?: string;
  filter?: {
    value?: 'page' | 'database';
    property?: 'object';
  };
  sort?: {
    direction: 'ascending' | 'descending';
    timestamp: 'last_edited_time';
  };
  startCursor?: string;
  pageSize?: number;
}) {
  try {
    const notion = getNotionClient();
    const searchParams: any = {};

    if (params.query) {
      searchParams.query = params.query;
    }

    if (params.filter) {
      searchParams.filter = params.filter;
    }

    if (params.sort) {
      searchParams.sort = params.sort;
    }

    if (params.startCursor) {
      searchParams.start_cursor = params.startCursor;
    }

    if (params.pageSize) {
      searchParams.page_size = Math.min(params.pageSize, 100); // Max 100 per Notion API
    }

    const response = await withRetry(() => notion.search(searchParams));

    logger.info('Search completed', {
      query: params.query,
      resultCount: response.results.length,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(response, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'search');
  }
}
