/**
 * Notion Comment Tools
 * Operations for creating and retrieving comments
 */

import { getNotionClient, withRetry } from '../api/notion-client.js';
import { handleNotionError, validatePageIdOrThrow } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Creates a comment on a Notion page or adds to an existing discussion thread
 *
 * Creates a new comment on a page or replies to an existing discussion. If discussionId
 * is provided, the comment is added to that discussion thread; otherwise, a new discussion
 * is started. Comments use rich text formatting.
 *
 * @param params - Function parameters
 * @param params.pageId - The UUID of the page to comment on
 * @param params.richText - Array of rich text objects containing the comment content
 * @param params.discussionId - Optional UUID of an existing discussion to reply to
 * @returns Promise resolving to MCP tool response containing the created comment object
 * @throws {McpError} NOT_FOUND (404) - When the page or discussion doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks permission to comment on the page
 * @throws {McpError} BAD_REQUEST (400) - When richText format is invalid or discussionId is malformed
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await createComment({
 *   pageId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   richText: [{ text: { content: "This is a comment" } }],
 *   discussionId: "d1e2f3g4-5678-90ab-cdef-1234567890ab" // Optional
 * });
 * ```
 */
export async function createComment(params: {
  pageId: string;
  richText: any[];
  discussionId?: string;
}) {
  try {
    validatePageIdOrThrow(params.pageId);

    const notion = getNotionClient();

    const commentData: any = {
      parent: {
        page_id: params.pageId,
      },
      rich_text: params.richText,
    };

    // If discussionId is provided, add comment to existing discussion
    if (params.discussionId) {
      commentData.discussion_id = params.discussionId;
    }

    const comment = await notion.comments.create(commentData);

    logger.info('Created comment', {
      pageId: params.pageId,
      discussionId: params.discussionId || 'new',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(comment, null, 2),
        },
      ],
    };
  } catch (error) {
    throw handleNotionError(error, 'createComment');
  }
}

/**
 * Retrieves all comments associated with a specific page or block
 *
 * Fetches comments and discussion threads for the specified page or block.
 * Returns comments in chronological order with support for pagination when
 * there are many comments.
 *
 * @param params - Function parameters
 * @param params.blockId - The UUID of the page or block to retrieve comments from
 * @param params.startCursor - Optional cursor for pagination continuation
 * @param params.pageSize - Optional page size (max 100, automatically capped)
 * @returns Promise resolving to MCP tool response containing array of comments and pagination info
 * @throws {McpError} NOT_FOUND (404) - When the page or block doesn't exist or is not accessible
 * @throws {McpError} UNAUTHORIZED (401) - When the API token is invalid or missing
 * @throws {McpError} FORBIDDEN (403) - When the integration lacks access to view comments
 * @throws {McpError} RATE_LIMITED (429) - When API rate limits are exceeded
 *
 * @example
 * ```typescript
 * await getComments({
 *   blockId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
 *   pageSize: 50
 * });
 * ```
 */
export async function getComments(params: {
  blockId: string;
  startCursor?: string;
  pageSize?: number;
}) {
  try {
    validatePageIdOrThrow(params.blockId, 'blockId');

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

    const response = await withRetry(() => notion.comments.list(queryParams));

    logger.info('Retrieved comments', {
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
    throw handleNotionError(error, 'getComments');
  }
}
