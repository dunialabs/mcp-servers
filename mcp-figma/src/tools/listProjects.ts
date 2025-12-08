/**
 * List Projects Tool
 * List all projects in a Figma team
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaListProjectsParamsSchema = z.object({
  team_id: z.string().describe('Figma team ID (required)'),
}).catchall(z.unknown());

export type FigmaListProjectsParams = z.infer<typeof FigmaListProjectsParamsSchema>;

export async function figmaListProjects(params: FigmaListProjectsParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaListProjects] params', params);

  try {
    const url = `${FIGMA_API_BASE}/teams/${params.team_id}/projects`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaListProjects] success', { projectCount: data.projects?.length || 0 });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaListProjects] error:', error.message);
    throw new Error(`Failed to list projects: ${error.message}`);
  }
}
