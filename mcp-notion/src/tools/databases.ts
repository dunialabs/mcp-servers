/**
 * Notion Database Tools
 * Operations for querying and managing databases
 */

import { getNotionClient, withRetry } from '../api/notion-client.js';
import { handleNotionError, validateDatabaseIdOrThrow, validatePageIdOrThrow } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves a Notion database by its ID
 *
 * Fetches complete database metadata including schema, properties, and configuration.
 * The database object contains title, description, properties, and parent information.
 *
 * @param params - Function parameters
 * @param params.databaseId - The UUID of the database to retrieve
 * @returns Promise resolving to MCP tool response containing the database object
 * @throws {McpError} NOT_FOUND (404) - When the database doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks access to the database
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await getDatabase({ databaseId: "a1b2c3d4-5678-90ab-cdef-1234567890ab" });
 * ```
 */
export async function getDatabase(params: { databaseId: string }) {
  try {
    validateDatabaseIdOrThrow(params.databaseId);

    const notion = getNotionClient();
    const database = await withRetry(() => notion.databases.retrieve({ database_id: params.databaseId }));

    logger.info('Retrieved database', { databaseId: params.databaseId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(database, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'getDatabase');
  }
}

/**
 * Queries a Notion database with optional filtering, sorting, and pagination
 *
 * Retrieves database entries (pages) based on specified criteria. Supports complex
 * filtering conditions, multiple sort criteria, and cursor-based pagination for
 * handling large result sets.
 *
 * @param params - Function parameters
 * @param params.databaseId - The UUID of the database to query
 * @param params.filter - Optional filter object following Notion's filter syntax
 * @param params.sorts - Optional array of sort objects specifying result ordering
 * @param params.startCursor - Optional cursor for pagination continuation
 * @param params.pageSize - Optional page size (max 100, automatically capped)
 * @returns Promise resolving to MCP tool response containing query results with pages array and pagination info
 * @throws {McpError} NOT_FOUND (404) - When the database doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks access to the database
 * @throws {McpError} BAD_REQUEST (400) - When filter or sort parameters are malformed
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await queryDatabase({
 *   databaseId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   filter: { property: "Status", select: { equals: "Done" } },
 *   sorts: [{ property: "Created", direction: "descending" }],
 *   pageSize: 50
 * });
 * ```
 */
export async function queryDatabase(params: {
  databaseId: string;
  filter?: any;
  sorts?: any[];
  startCursor?: string;
  pageSize?: number;
}) {
  try {
    validateDatabaseIdOrThrow(params.databaseId);

    const notion = getNotionClient();
    const queryParams: any = {
      database_id: params.databaseId,
    };

    if (params.filter) {
      queryParams.filter = params.filter;
    }

    if (params.sorts) {
      queryParams.sorts = params.sorts;
    }

    if (params.startCursor) {
      queryParams.start_cursor = params.startCursor;
    }

    if (params.pageSize) {
      queryParams.page_size = Math.min(params.pageSize, 100); // Max 100 per Notion API
    }

    const response = await withRetry(() => notion.databases.query(queryParams));

    logger.info('Queried database', {
      databaseId: params.databaseId,
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
    throw handleNotionError(error, 'queryDatabase');
  }
}

/**
 * Creates a new Notion database as a child of a specified page
 *
 * Creates a database with defined properties schema. The database is placed as a child
 * of the specified parent page. Properties define the columns/fields available for
 * database entries.
 *
 * @param params - Function parameters
 * @param params.parentPageId - The UUID of the parent page where the database will be created
 * @param params.title - The title/name of the new database
 * @param params.properties - Object defining database properties (columns) with their types and configurations
 * @param params.description - Optional description text for the database
 * @returns Promise resolving to MCP tool response containing the created database object
 * @throws {McpError} NOT_FOUND (404) - When the parent page doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to create databases in the parent page
 * @throws {McpError} BAD_REQUEST (400) - When properties schema is invalid or malformed
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await createDatabase({
 *   parentPageId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   title: "Project Tasks",
 *   properties: {
 *     "Name": { title: {} },
 *     "Status": { select: { options: [{ name: "Todo" }, { name: "Done" }] } },
 *     "Due Date": { date: {} }
 *   },
 *   description: "Database for tracking project tasks"
 * });
 * ```
 */
export async function createDatabase(params: {
  parentPageId: string;
  title: string;
  properties: Record<string, any>;
  description?: string;
}) {
  try {
    validatePageIdOrThrow(params.parentPageId, 'parentPageId');

    const notion = getNotionClient();

    const database = await notion.databases.create({
      parent: {
        page_id: params.parentPageId,
      },
      title: [
        {
          text: {
            content: params.title,
          },
        },
      ],
      properties: params.properties,
      ...(params.description && {
        description: [
          {
            text: {
              content: params.description,
            },
          },
        ],
      }),
    });

    logger.info('Created database', { databaseId: database.id, title: params.title });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(database, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'createDatabase');
  }
}

/**
 * Updates an existing Notion database's metadata and schema
 *
 * Modifies database title, description, properties schema, or archive status. All parameters
 * are optional except databaseId. Properties can be added, updated, or removed. Setting
 * archived to true moves the database to trash.
 *
 * @param params - Function parameters
 * @param params.databaseId - The UUID of the database to update
 * @param params.title - Optional new title for the database
 * @param params.properties - Optional updated properties schema (replaces existing properties)
 * @param params.description - Optional new description (pass empty string to clear)
 * @param params.archived - Optional boolean to archive (true) or restore (false) the database
 * @returns Promise resolving to MCP tool response containing the updated database object
 * @throws {McpError} NOT_FOUND (404) - When the database doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to modify the database
 * @throws {McpError} BAD_REQUEST (400) - When properties schema updates are invalid
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await updateDatabase({
 *   databaseId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   title: "Updated Project Tasks",
 *   properties: {
 *     "Priority": { select: { options: [{ name: "High" }, { name: "Low" }] } }
 *   }
 * });
 * ```
 */
export async function updateDatabase(params: {
  databaseId: string;
  title?: string;
  properties?: Record<string, any>;
  description?: string;
  archived?: boolean;
}) {
  try {
    validateDatabaseIdOrThrow(params.databaseId);

    const notion = getNotionClient();
    const updateData: any = {
      database_id: params.databaseId,
    };

    if (params.title) {
      updateData.title = [
        {
          text: {
            content: params.title,
          },
        },
      ];
    }

    if (params.properties) {
      updateData.properties = params.properties;
    }

    if (params.description !== undefined) {
      updateData.description = [
        {
          text: {
            content: params.description,
          },
        },
      ];
    }

    if (params.archived !== undefined) {
      updateData.archived = params.archived;
    }

    const database = await notion.databases.update(updateData);

    logger.info('Updated database', { databaseId: params.databaseId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(database, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'updateDatabase');
  }
}
