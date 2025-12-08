/**
 * Get Versions Tool
 * Get version history of a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetVersionsParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  page_size: z.number().optional().describe('Number of versions per page (optional, max: 100)'),
}).catchall(z.unknown());

export type FigmaGetVersionsParams = z.infer<typeof FigmaGetVersionsParamsSchema>;

export async function figmaGetVersions(params: FigmaGetVersionsParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetVersions] params', params);

  try {
    const queryParams = new URLSearchParams();
    if (params.page_size !== undefined) queryParams.append('page_size', String(params.page_size));

    const queryString = queryParams.toString();
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/versions${queryString ? `?${queryString}` : ''}`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetVersions] success', { versionCount: data.versions?.length || 0 });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetVersions] error:', error.message);
    throw new Error(`Failed to get versions: ${error.message}`);
  }
}
