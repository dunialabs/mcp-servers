/**
 * Get Variables Tool
 * Get local variables and variable collections from a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetVariablesParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
}).catchall(z.unknown());

export type FigmaGetVariablesParams = z.infer<typeof FigmaGetVariablesParamsSchema>;

export async function figmaGetVariables(params: FigmaGetVariablesParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetVariables] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/variables/local`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetVariables] success', {
      variableCount: Object.keys(data.meta?.variables || {}).length,
      collectionCount: Object.keys(data.meta?.variableCollections || {}).length,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetVariables] error:', error.message);
    throw new Error(`Failed to get variables: ${error.message}`);
  }
}
