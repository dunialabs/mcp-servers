/**
 * List Comments Tool
 * List all comments in a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaListCommentsParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
}).catchall(z.unknown());

export type FigmaListCommentsParams = z.infer<typeof FigmaListCommentsParamsSchema>;

export async function figmaListComments(params: FigmaListCommentsParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaListComments] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/comments`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaListComments] success', { commentCount: data.comments?.length || 0 });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaListComments] error:', error.message);
    throw new Error(`Failed to list comments: ${error.message}`);
  }
}
