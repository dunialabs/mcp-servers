/**
 * Notion Block Tools
 * Operations for reading and manipulating blocks (content)
 */

import { getNotionClient, withRetry } from '../api/notion-client.js';
import { handleNotionError, validateBlockIdOrThrow } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Retrieves all child blocks of a specified parent block or page
 *
 * Returns the nested content blocks (paragraphs, headings, lists, etc.) that are
 * children of the specified block or page. Supports pagination for blocks with
 * many children.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the parent block or page
 * @param params.startCursor - Optional cursor for pagination continuation
 * @param params.pageSize - Optional page size (max 100, automatically capped)
 * @returns Promise resolving to MCP tool response containing array of child blocks and pagination info
 * @throws {McpError} NOT_FOUND (404) - When the block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks access to the block
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await getBlockChildren({
 *   blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   pageSize: 50
 * });
 * ```
 */
export async function getBlockChildren(params: {
  blockId: string;
  startCursor?: string;
  pageSize?: number;
}) {
  try {
    validateBlockIdOrThrow(params.blockId);

    const notion = getNotionClient();
    const queryParams: any = {
      block_id: params.blockId,
    };

    if (params.startCursor) {
      queryParams.start_cursor = params.startCursor;
    }

    if (params.pageSize) {
      queryParams.page_size = Math.min(params.pageSize, 100); // Max 100 per Notion API
    }

    const response = await withRetry(() => notion.blocks.children.list(queryParams));

    logger.info('Retrieved block children', {
      blockId: params.blockId,
      count: response.results.length,
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
    throw handleNotionError(error, 'getBlockChildren');
  }
}

/**
 * Appends new child blocks to the end of a specified parent block or page
 *
 * Adds one or more content blocks (paragraphs, headings, lists, etc.) as children
 * of the target block. Blocks are appended after any existing children. Maximum
 * of 100 blocks can be appended in a single request.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the parent block or page to append to
 * @param params.children - Array of block objects to append (max 100 blocks)
 * @returns Promise resolving to MCP tool response containing the result with appended blocks
 * @throws {McpError} NOT_FOUND (404) - When the parent block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to modify the block
 * @throws {McpError} BAD_REQUEST (400) - When block objects are malformed or exceed limits
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await appendBlocks({
 *   blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   children: [
 *     { object: "block", type: "paragraph", paragraph: { rich_text: [{ text: { content: "Hello" } }] } },
 *     { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Heading" } }] } }
 *   ]
 * });
 * ```
 */
export async function appendBlocks(params: {
  blockId: string;
  children: any[];
}) {
  try {
    validateBlockIdOrThrow(params.blockId);

    const notion = getNotionClient();
    const response = await notion.blocks.children.append({
      block_id: params.blockId,
      children: params.children,
    });

    logger.info('Appended blocks', {
      blockId: params.blockId,
      childrenCount: params.children.length,
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
    throw handleNotionError(error, 'appendBlocks');
  }
}

/**
 * Retrieves a specific block by its ID
 *
 * Fetches detailed information about a single block including its type, content,
 * and metadata. Useful for inspecting specific blocks or verifying block properties.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the block to retrieve
 * @returns Promise resolving to MCP tool response containing the block object
 * @throws {McpError} NOT_FOUND (404) - When the block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks access to the block
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await getBlock({ blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab" });
 * ```
 */
export async function getBlock(params: { blockId: string }) {
  try {
    validateBlockIdOrThrow(params.blockId);

    const notion = getNotionClient();
    const block = await withRetry(() => notion.blocks.retrieve({ block_id: params.blockId }));

    logger.info('Retrieved block', { blockId: params.blockId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'getBlock');
  }
}

/**
 * Updates the content or properties of an existing block
 *
 * Modifies a block's content based on its type. Only certain block types support
 * updates (paragraphs, headings, lists, etc.). Cannot change a block's type, only
 * its content within the same type. Can also archive/unarchive the block.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the block to update
 * @param params.type - The block type (must match the existing block's type)
 * @param params.content - The new content object matching the block type's schema
 * @param params.archived - Optional boolean to archive (true) or restore (false) the block
 * @returns Promise resolving to MCP tool response containing the updated block object
 * @throws {McpError} NOT_FOUND (404) - When the block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to modify the block
 * @throws {McpError} BAD_REQUEST (400) - When content is malformed, type mismatch, or block type doesn't support updates
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await updateBlock({
 *   blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   type: "paragraph",
 *   content: { rich_text: [{ text: { content: "Updated text" } }] }
 * });
 * ```
 */
export async function updateBlock(params: {
  blockId: string;
  type: string;
  content: any;
  archived?: boolean;
}) {
  try {
    validateBlockIdOrThrow(params.blockId);

    const notion = getNotionClient();
    const updateData: any = {
      block_id: params.blockId,
      [params.type]: params.content,
    };

    if (params.archived !== undefined) {
      updateData.archived = params.archived;
    }

    const block = await notion.blocks.update(updateData);

    logger.info('Updated block', { blockId: params.blockId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'updateBlock');
  }
}

/**
 * Deletes a block by archiving it (moves to trash)
 *
 * Archives (soft deletes) the specified block, moving it to Notion's trash.
 * The block can be restored from trash in the Notion UI. All child blocks
 * are also archived along with the parent block.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the block to delete/archive
 * @returns Promise resolving to MCP tool response containing the archived block object
 * @throws {McpError} NOT_FOUND (404) - When the block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to delete the block
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await deleteBlock({ blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab" });
 * ```
 */
export async function deleteBlock(params: { blockId: string }) {
  try {
    validateBlockIdOrThrow(params.blockId);

    const notion = getNotionClient();
    const block = await notion.blocks.delete({ block_id: params.blockId });

    logger.info('Deleted block', { blockId: params.blockId });
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(block, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'deleteBlock');
  }
}
