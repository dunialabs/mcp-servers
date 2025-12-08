/**
 * Get Components Tool
 * Get components and component sets from a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetComponentsParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
}).catchall(z.unknown());

export type FigmaGetComponentsParams = z.infer<typeof FigmaGetComponentsParamsSchema>;

export async function figmaGetComponents(params: FigmaGetComponentsParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetComponents] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/components`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetComponents] success', {
      componentCount: Object.keys(data.meta?.components || {}).length,
      componentSetCount: Object.keys(data.meta?.component_sets || {}).length,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetComponents] error:', error.message);
    throw new Error(`Failed to get components: ${error.message}`);
  }
}
