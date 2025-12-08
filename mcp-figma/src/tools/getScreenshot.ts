/**
 * Get Screenshot Tool
 * Get rendered images (screenshots) of Figma nodes
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetScreenshotParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  ids: z.array(z.string()).describe('Array of node IDs to render (required)'),
  scale: z.number().optional().describe('Image scale (0.01 to 4, default: 1)'),
  format: z.enum(['jpg', 'png', 'svg', 'pdf']).optional().describe('Image format (default: png)'),
  svg_include_id: z.boolean().optional().describe('Include id attributes in SVG (optional)'),
  svg_simplify_stroke: z.boolean().optional().describe('Simplify strokes in SVG (optional)'),
  use_absolute_bounds: z.boolean().optional().describe('Use absolute bounding box (optional)'),
  version: z.string().optional().describe('File version ID (optional)'),
}).catchall(z.unknown());

export type FigmaGetScreenshotParams = z.infer<typeof FigmaGetScreenshotParamsSchema>;

export async function figmaGetScreenshot(params: FigmaGetScreenshotParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetScreenshot] params', params);

  try {
    const queryParams = new URLSearchParams();
    queryParams.append('ids', params.ids.join(','));
    if (params.scale !== undefined) queryParams.append('scale', String(params.scale));
    if (params.format) queryParams.append('format', params.format);
    if (params.svg_include_id !== undefined) queryParams.append('svg_include_id', String(params.svg_include_id));
    if (params.svg_simplify_stroke !== undefined) queryParams.append('svg_simplify_stroke', String(params.svg_simplify_stroke));
    if (params.use_absolute_bounds !== undefined) queryParams.append('use_absolute_bounds', String(params.use_absolute_bounds));
    if (params.version) queryParams.append('version', params.version);

    const url = `${FIGMA_API_BASE}/images/${params.file_key}?${queryParams.toString()}`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaGetScreenshot] success', { imageCount: Object.keys(data.images || {}).length });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetScreenshot] error:', error.message);
    throw new Error(`Failed to get screenshots: ${error.message}`);
  }
}
