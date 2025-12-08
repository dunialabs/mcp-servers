/**
 * Get Styles Tool
 * Get styles (text, color, effect, grid) from a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetStylesParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
}).catchall(z.unknown());

export type FigmaGetStylesParams = z.infer<typeof FigmaGetStylesParamsSchema>;

export async function figmaGetStyles(params: FigmaGetStylesParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetStyles] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/styles`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetStyles] success', {
      styleCount: Object.keys(data.meta?.styles || {}).length,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetStyles] error:', error.message);
    throw new Error(`Failed to get styles: ${error.message}`);
  }
}
