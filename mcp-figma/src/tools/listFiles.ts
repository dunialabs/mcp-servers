/**
 * List Files Tool
 * Lists all files in a Figma project
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaListFilesParamsSchema = z.object({
  project_id: z.string().describe('Figma project ID (required)'),
}).catchall(z.unknown());

export type FigmaListFilesParams = z.infer<typeof FigmaListFilesParamsSchema>;

export async function figmaListFiles(params: FigmaListFilesParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaListFiles] params', params);

  try {
    const url = `${FIGMA_API_BASE}/projects/${params.project_id}/files`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaListFiles] success', { fileCount: data.files?.length || 0 });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaListFiles] error:', error.message);
    throw new Error(`Failed to list files: ${error.message}`);
  }
}
