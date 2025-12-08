/**
 * Test Connection Tool
 * Test Figma API connection and verify authentication
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaTestConnectionParamsSchema = z.object({}).catchall(z.unknown());

export type FigmaTestConnectionParams = z.infer<typeof FigmaTestConnectionParamsSchema>;

export async function figmaTestConnection(_params: FigmaTestConnectionParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaTestConnection] Testing connection');

  try {
    const url = `${FIGMA_API_BASE}/me`;
    const data: any = await figmaFetch(url);

    logger.info('[FigmaTestConnection] Connection successful', {
      userId: data.id,
      email: data.email,
    });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          user: {
            id: data.id,
            email: data.email,
            handle: data.handle,
          },
          message: 'Figma API connection successful',
        }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaTestConnection] Connection failed:', error.message);

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: false,
          error: error.message,
          hint: 'Please check your accessToken environment variable. Visit https://www.figma.com/settings to generate a new Personal Access Token.',
        }, null, 2),
      }],
    };
  }
}
