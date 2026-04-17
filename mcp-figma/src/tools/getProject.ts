/**
 * Get Project Tool
 * Get details of a specific Figma project
 */

import { createFigmaFetch, FIGMA_API_BASE, throwToolError } from './common.js';
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
    const url = `${FIGMA_API_BASE}/projects/${params.project_id}/files`;
    const filesResponse: any = await figmaFetch(url);
    const data = {
      id: params.project_id,
      name: filesResponse.name ?? `Project ${params.project_id}`,
      description: null,
      files: filesResponse.files ?? [],
    };

    logger.info('[FigmaGetProject] success', {
      projectId: params.project_id,
      fileCount: data.files.length,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetProject] error:', error.message);
    throwToolError(error, 'Failed to get project');
  }
}
