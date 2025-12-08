/**
 * Get Metadata Tool
 * Get simplified metadata for a Figma file
 */

import { createFigmaFetch, FIGMA_API_BASE } from './common.js';
import { logger } from '../utils/logger.js';
import { z } from 'zod';

export const FigmaGetMetadataParamsSchema = z.object({
  file_key: z.string().describe('Figma file key (required)'),
  lightweight: z.boolean().optional().describe('Return sparse XML with only basic properties (layer IDs, names, types, positions, sizes). Default: false (returns full JSON)'),
  format: z.enum(['json', 'xml']).optional().describe('Output format: json or xml. Default: json'),
}).catchall(z.unknown());

export type FigmaGetMetadataParams = z.infer<typeof FigmaGetMetadataParamsSchema>;

/**
 * Convert node tree to XML format
 */
function nodeToXML(node: any, indent: string = ''): string {
  const { id, name, type, absoluteBoundingBox, children } = node;
  const attrs: string[] = [];

  attrs.push(`id="${id}"`);
  attrs.push(`name="${name || ''}"`);
  attrs.push(`type="${type}"`);

  if (absoluteBoundingBox) {
    attrs.push(`x="${absoluteBoundingBox.x}"`);
    attrs.push(`y="${absoluteBoundingBox.y}"`);
    attrs.push(`width="${absoluteBoundingBox.width}"`);
    attrs.push(`height="${absoluteBoundingBox.height}"`);
  }

  const attrsStr = attrs.join(' ');

  if (children && children.length > 0) {
    let xml = `${indent}<node ${attrsStr}>\n`;
    for (const child of children) {
      xml += nodeToXML(child, indent + '  ');
    }
    xml += `${indent}</node>\n`;
    return xml;
  } else {
    return `${indent}<node ${attrsStr} />\n`;
  }
}

export async function figmaGetMetadata(params: FigmaGetMetadataParams) {
  const figmaFetch = createFigmaFetch();
  logger.debug('[FigmaGetMetadata] params', params);

  try {
    // Get minimal file info by requesting depth=1 (minimum valid depth)
    const url = `${FIGMA_API_BASE}/files/${params.file_key}?depth=1`;
    const data: any = await figmaFetch(url);

    // If lightweight XML format is requested
    if (params.lightweight || params.format === 'xml') {
      let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
      xml += `<file name="${data.name}" lastModified="${data.lastModified}" version="${data.version}">\n`;

      if (data.document && data.document.children) {
        for (const child of data.document.children) {
          xml += nodeToXML(child, '  ');
        }
      }

      xml += '</file>';

      logger.info('[FigmaGetMetadata] success (XML format)', { fileName: data.name });

      return {
        content: [{
          type: 'text' as const,
          text: xml,
        }],
      };
    }

    // Extract simplified metadata (default JSON format)
    const metadata = {
      name: data.name,
      lastModified: data.lastModified,
      thumbnailUrl: data.thumbnailUrl,
      version: data.version,
      role: data.role,
      editorType: data.editorType,
      linkAccess: data.linkAccess,
    };

    logger.info('[FigmaGetMetadata] success', { fileName: metadata.name });

    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: true, metadata }, null, 2),
      }],
    };
  } catch (error: any) {
    logger.error('[FigmaGetMetadata] error:', error.message);
    throw new Error(`Failed to get metadata: ${error.message}`);
  }
}
