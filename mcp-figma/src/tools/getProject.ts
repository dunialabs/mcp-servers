/**
 * Get Project Tool
 * Get details of a specific Figma project
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetProjectParamsSchema = z.object({
  project_id: z.string().describe('Figma project ID (required)'),
}).catchall(z.unknown());

export type FigmaGetProjectParams = z.infer<typeof FigmaGetProjectParamsSchema>;

export async function figmaGetProject(params: FigmaGetProjectParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetProject] params', params);

  try {
    const url = `${FIGMA_API_BASE}/projects/${params.project_id}`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetProject] success', { projectName: data.name });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetProject] error:', error.message);
    throw new Error(`Failed to get project: ${error.message}`);
  }
}
