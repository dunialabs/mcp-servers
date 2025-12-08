/**
 * Create Comment Tool
 * Create a new comment in a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaCreateCommentParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  message: z.string().describe('Comment message text (required)'),
  client_meta: z.union([
    z.object({
      x: z.number().describe('X coordinate on the canvas'),
      y: z.number().describe('Y coordinate on the canvas'),
    }).catchall(z.unknown()).describe('Canvas coordinates'),
    z.object({
      node_id: z.string().describe('Node ID to attach comment to'),
      node_offset: z.object({
        x: z.number().describe('X offset within node'),
        y: z.number().describe('Y offset within node'),
      }).catchall(z.unknown()).describe('Offset within node (required when using node_id)'),
    }).catchall(z.unknown()).describe('Node-relative coordinates'),
  ]).describe('Comment position metadata - either canvas coordinates {x, y} or node-relative {node_id, node_offset: {x, y}} (required)'),
}).catchall(z.unknown());

export type FigmaCreateCommentParams = z.infer<typeof FigmaCreateCommentParamsSchema>;

export async function figmaCreateComment(params: FigmaCreateCommentParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaCreateComment] params', params);

  try {
    const url = `${FIGMA_API_BASE}/files/${params.file_key}/comments`;

    const body: any = {
      message: params.message,
    };

    if (params.client_meta) {
      body.client_meta = params.client_meta;
    }

    const data: any = await figmaFetch(url, {
      method: 'POST',
      body: JSON.stringify(body),
    });

    logger.info('[FigmaCreateComment] success', { commentId: data.id });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, data }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaCreateComment] error:', error.message);
    throw new Error(`Failed to create comment: ${error.message}`);
  }
}
