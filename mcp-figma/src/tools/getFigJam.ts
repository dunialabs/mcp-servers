/**
 * Get FigJam Tool
 * Get FigJam diagram content in XML format with screenshots
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetFigJamParamsSchema = z.object({
  file_key: z.string().describe('FigJam file key (required)'),
  node_ids: z.array(z.string()).optional().describe('Specific node IDs to retrieve. If not provided, returns all top-level nodes (optional)'),
  include_screenshots: z.boolean().optional().describe('Include screenshot URLs for nodes. Default: true'),
  scale: z.number().optional().describe('Screenshot scale (0.01 to 4). Default: 1'),
}).catchall(z.unknown());

export type FigmaGetFigJamParams = z.infer<typeof FigmaGetFigJamParamsSchema>;

/**
 * Convert node tree to XML format with screenshots
 */
function nodeToXML(node: any, screenshots: Record<string, string> = {}, indent: string = ''): string {
  const { id, name, type, absoluteBoundingBox, children } = node;
  const attrs: string[] = [];

  attrs.push(`id="${id}"`);
  attrs.push(`name="${escapeXML(name || '')}"`);
  attrs.push(`type="${type}"`);

  if (absoluteBoundingBox) {
    attrs.push(`x="${absoluteBoundingBox.x}"`);
    attrs.push(`y="${absoluteBoundingBox.y}"`);
    attrs.push(`width="${absoluteBoundingBox.width}"`);
    attrs.push(`height="${absoluteBoundingBox.height}"`);
  }

  // Add screenshot URL if available
  if (screenshots[id]) {
    attrs.push(`screenshot="${escapeXML(screenshots[id])}"`);
  }

  const attrsStr = attrs.join(' ');

  if (children && children.length > 0) {
    let xml = `${indent}<node ${attrsStr}>\n`;
    for (const child of children) {
      xml += nodeToXML(child, screenshots, indent + '  ');
    }
    xml += `${indent}</node>\n`;
    return xml;
  } else {
    return `${indent}<node ${attrsStr} />\n`;
  }
}

/**
 * Escape XML special characters
 */
function escapeXML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Collect all node IDs from a tree
 */
function collectNodeIds(node: any, ids: string[] = []): string[] {
  if (node.id) {
    ids.push(node.id);
  }
  if (node.children) {
    for (const child of node.children) {
      collectNodeIds(child, ids);
    }
  }
  return ids;
}

export async function figmaGetFigJam(params: FigmaGetFigJamParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetFigJam] params', params);

  try {
    // Step 1: Get FigJam file structure
    const fileUrl = `${FIGMA_API_BASE}/files/${params.file_key}?depth=2`;
    const fileData: any = await figmaFetch(fileUrl);

    // Check if this is a FigJam file
    if (fileData.editorType !== 'figjam') {
      logger.warn('[FigmaGetFigJam] File is not a FigJam file', { editorType: fileData.editorType });
    }

    // Step 2: Get screenshots if requested (default: true)
    const includeScreenshots = params.include_screenshots !== false;
    let screenshots: Record<string, string> = {};

    if (includeScreenshots) {
      // Collect all node IDs to screenshot
      const nodeIds: string[] = [];

      if (params.node_ids && params.node_ids.length > 0) {
        // Use specified node IDs
        nodeIds.push(...params.node_ids);
      } else if (fileData.document && fileData.document.children) {
        // Collect all node IDs from the document tree
        for (const child of fileData.document.children) {
          collectNodeIds(child, nodeIds);
        }
      }

      if (nodeIds.length > 0) {
        try {
          const screenshotParams = new URLSearchParams();
          screenshotParams.append('ids', nodeIds.join(','));
          screenshotParams.append('format', 'png');
          if (params.scale) {
            screenshotParams.append('scale', String(params.scale));
          }

          const screenshotUrl = `${FIGMA_API_BASE}/images/${params.file_key}?${screenshotParams.toString()}`;
          const screenshotData: any = await figmaFetch(screenshotUrl);

          if (screenshotData.images) {
            screenshots = screenshotData.images;
          }
        } catch (error: any) {
          logger.warn('[FigmaGetFigJam] Failed to get screenshots, continuing without them', { error: error.message });
        }
      }
    }

    // Step 3: Build XML output
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += `<figjam name="${escapeXML(fileData.name)}" lastModified="${fileData.lastModified}" version="${fileData.version}">\n`;

    if (params.node_ids && params.node_ids.length > 0) {
      // Get specific nodes
      const nodesUrl = `${FIGMA_API_BASE}/files/${params.file_key}/nodes?ids=${params.node_ids.join(',')}&depth=2`;
      const nodesData: any = await figmaFetch(nodesUrl);

      if (nodesData.nodes) {
        for (const [, nodeInfo] of Object.entries(nodesData.nodes as Record<string, any>)) {
          if (nodeInfo.document) {
            xml += nodeToXML(nodeInfo.document, screenshots, '  ');
          }
        }
      }
    } else if (fileData.document && fileData.document.children) {
      // Get all top-level nodes
      for (const child of fileData.document.children) {
        xml += nodeToXML(child, screenshots, '  ');
      }
    }

    xml += '</figjam>';

    logger.info('[FigmaGetFigJam] success', {
      fileName: fileData.name,
      editorType: fileData.editorType,
      screenshotCount: Object.keys(screenshots).length,
    });

    return {
      content: [{
        type: 'text' as const,
        text: xml,
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetFigJam] error:', error.message);
    throw new Error(`Failed to get FigJam: ${error.message}`);
  }
}
