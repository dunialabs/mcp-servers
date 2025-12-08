/**
 * Get Node Tool
 * Get specific nodes from a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetNodeParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  ids: z.array(z.string()).describe('Array of node IDs to retrieve (required)'),
  version: z.string().optional().describe('File version ID (optional)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional)'),
  geometry: z.enum(['paths']).optional().describe('Set to "paths" to export vector data (optional)'),
  plugin_data: z.string().optional().describe('Plugin ID to retrieve plugin data (optional)'),
}).catchall(z.unknown());

export type FigmaGetNodeParams = z.infer<typeof FigmaGetNodeParamsSchema>;

export async function figmaGetNode(params: FigmaGetNodeParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetNode] params', params);

  try {
    const queryParams = new URLSearchParams();
    queryParams.append('ids', params.ids.join(','));
    if (params.version) queryParams.append('version', params.version);
    if (params.depth !== undefined) queryParams.append('depth', String(params.depth));
    if (params.geometry) queryParams.append('geometry', params.geometry);
    if (params.plugin_data) queryParams.append('plugin_data', params.plugin_data);

    const url = `${FIGMA_API_BASE}/files/${params.file_key}/nodes?${queryParams.toString()}`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetNode] success', { nodeCount: Object.keys(data.nodes || {}).length });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetNode] error:', error.message);
    throw new Error(`Failed to get nodes: ${error.message}`);
  }
}
