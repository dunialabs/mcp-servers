/**
 * Get Design Context Tool
 * Get comprehensive design context including file structure, variables, and components
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetDesignContextParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  depth: z.number().optional().describe('Depth of node tree to retrieve (optional, default: 2)'),
}).catchall(z.unknown());

export type FigmaGetDesignContextParams = z.infer<typeof FigmaGetDesignContextParamsSchema>;

export async function figmaGetDesignContext(params: FigmaGetDesignContextParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetDesignContext] params', params);

  try {
    const depth = params.depth || 2;

    // Fetch file structure, variables, and components in parallel
    const [fileData, variablesData, componentsData, stylesData] = await Promise.all([
      figmaFetch(`${FIGMA_API_BASE}/files/${params.file_key}?depth=${depth}`).catch(() => null),
      figmaFetch(`${FIGMA_API_BASE}/files/${params.file_key}/variables/local`).catch(() => null),
      figmaFetch(`${FIGMA_API_BASE}/files/${params.file_key}/components`).catch(() => null),
      figmaFetch(`${FIGMA_API_BASE}/files/${params.file_key}/styles`).catch(() => null),
    ]);

    const context = {
      file: fileData ? {
        name: (fileData as any).name,
        lastModified: (fileData as any).lastModified,
        version: (fileData as any).version,
        thumbnailUrl: (fileData as any).thumbnailUrl,
        role: (fileData as any).role,
        editorType: (fileData as any).editorType,
        document: (fileData as any).document,
      } : null,
      variables: variablesData ? {
        variableCollections: (variablesData as any).meta?.variableCollections || {},
        variables: (variablesData as any).meta?.variables || {},
      } : null,
      components: componentsData ? {
        componentSets: (componentsData as any).meta?.component_sets || {},
        components: (componentsData as any).meta?.components || {},
      } : null,
      styles: stylesData ? {
        styles: (stylesData as any).meta?.styles || {},
      } : null,
    };

    logger.info('[FigmaGetDesignContext] success', { fileName: (fileData as any)?.name });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, context }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetDesignContext] error:', error.message);
    throw new Error(`Failed to get design context: ${error.message}`);
  }
}
