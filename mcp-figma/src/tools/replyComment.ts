/**
 * Reply Comment Tool
 * Reply to an existing comment in a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaReplyCommentParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  comment_id: z.string().describe('Parent comment ID to reply to (required)'),
  message: z.string().describe('Reply message text (required)'),
}).catchall(z.unknown());

export type FigmaReplyCommentParams = z.infer<typeof FigmaReplyCommentParamsSchema>;

export async function figmaReplyComment(params: FigmaReplyCommentParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaReplyComment] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/comments`;

    const body = {
      message: params.message,
      comment_id: params.comment_id,
    };

    const data: any = await figmaFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    logger.info('[FigmaReplyComment] success', { commentId: data.id });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaReplyComment] error:', error.message);
    throw new Error(`Failed to reply to comment: ${error.message}`);
  }
}
