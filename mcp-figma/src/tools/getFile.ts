/**
 * Get File Tool
 * Get the full document structure of a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetFileParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  version: z.string().optional().describe('File version ID to retrieve (optional)'),
  ids: z.array(z.string()).optional().describe('Array of node IDs to retrieve (optional, gets specific nodes only)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional, default: all)'),
  geometry: z.enum(['paths']).optional().describe('Set to "paths" to export vector data (optional)'),
  plugin_data: z.string().optional().describe('Plugin ID to retrieve plugin data (optional)'),
  branch_data: z.boolean().optional().describe('Include branch data (optional)'),
}).catchall(z.unknown());

export type FigmaGetFileParams = z.infer<typeof FigmaGetFileParamsSchema>;

export async function figmaGetFile(params: FigmaGetFileParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetFile] params', params);

  try {
    const queryParams = new URLSearchParams();
    if (params.version) queryParams.append('version', params.version);
    if (params.ids && params.ids.length > 0) queryParams.append('ids', params.ids.join(','));
    if (params.depth !== undefined) queryParams.append('depth', String(params.depth));
    if (params.geometry) queryParams.append('geometry', params.geometry);
    if (params.plugin_data) queryParams.append('plugin_data', params.plugin_data);
    if (params.branch_data) queryParams.append('branch_data', String(params.branch_data));

    const queryString = queryParams.toString();
    const url = `${FIGMA_API_BASE}/files/${params.file_key}${queryString ? `?${queryString}` : ''}`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetFile] success', { fileName: data.name });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetFile] error:', error.message);
    throw new Error(`Failed to get file: ${error.message}`);
  }
}
