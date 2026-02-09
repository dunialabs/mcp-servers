/**
 * Google Docs Format Tools
 * Apply text and paragraph formatting to Google Docs documents
 */

import { getDocsClient } from './common.js';
import {
  handleGoogleDocsError,
  validateDocumentIdOrThrow,
  validateIndexOrThrow,
  createInvalidParamsError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';
import type { docs_v1 } from 'googleapis';

export interface FormatTextParams {
  documentId: string;
  startIndex: number;
  endIndex: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  fontSize?: number;
  fontFamily?: string;
  foregroundColor?: string;
  backgroundColor?: string;
  link?: string;
}

export interface FormatTextResult {
  success: boolean;
  documentId: string;
  formattedRange: {
    startIndex: number;
    endIndex: number;
  };
  appliedStyles: string[];
}

export interface FormatParagraphParams {
  documentId: string;
  startIndex: number;
  endIndex: number;
  alignment?: 'START' | 'CENTER' | 'END' | 'JUSTIFIED';
  namedStyleType?: 'NORMAL_TEXT' | 'HEADING_1' | 'HEADING_2' | 'HEADING_3' | 'HEADING_4' | 'HEADING_5' | 'HEADING_6' | 'TITLE' | 'SUBTITLE';
  lineSpacing?: number;
  spaceAbove?: number;
  spaceBelow?: number;
  indentFirstLine?: number;
  indentStart?: number;
}

export interface FormatParagraphResult {
  success: boolean;
  documentId: string;
  formattedRange: {
    startIndex: number;
    endIndex: number;
  };
  appliedStyles: string[];
}

/**
 * Parse hex color string to RGB values (0-1 range)
 */
function parseHexColor(hex: string): { red: number; green: number; blue: number } | null {
  // Remove # if present
  const cleanHex = hex.replace(/^#/, '');

  if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
    return null;
  }

  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  return { red: r, green: g, blue: b };
}

/**
 * Apply text formatting to a range in a Google Docs document
 */
export async function formatText(params: FormatTextParams): Promise<FormatTextResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.startIndex, 'startIndex');
  validateIndexOrThrow(params.endIndex, 'endIndex');

  if (params.startIndex >= params.endIndex) {
    throw createInvalidParamsError('startIndex must be less than endIndex');
  }

  logger.info('[gdocsFormatText] Formatting text', {
    documentId: params.documentId,
    startIndex: params.startIndex,
    endIndex: params.endIndex,
  });

  const docs = getDocsClient();
  const appliedStyles: string[] = [];

  // Build text style object
  const textStyle: docs_v1.Schema$TextStyle = {};
  const fields: string[] = [];

  if (params.bold !== undefined) {
    textStyle.bold = params.bold;
    fields.push('bold');
    appliedStyles.push(params.bold ? 'bold' : 'not bold');
  }

  if (params.italic !== undefined) {
    textStyle.italic = params.italic;
    fields.push('italic');
    appliedStyles.push(params.italic ? 'italic' : 'not italic');
  }

  if (params.underline !== undefined) {
    textStyle.underline = params.underline;
    fields.push('underline');
    appliedStyles.push(params.underline ? 'underline' : 'not underline');
  }

  if (params.strikethrough !== undefined) {
    textStyle.strikethrough = params.strikethrough;
    fields.push('strikethrough');
    appliedStyles.push(params.strikethrough ? 'strikethrough' : 'not strikethrough');
  }

  if (params.fontSize !== undefined) {
    if (params.fontSize < 1 || params.fontSize > 400) {
      throw createInvalidParamsError('fontSize must be between 1 and 400 points');
    }
    textStyle.fontSize = {
      magnitude: params.fontSize,
      unit: 'PT',
    };
    fields.push('fontSize');
    appliedStyles.push(`fontSize: ${params.fontSize}pt`);
  }

  if (params.fontFamily !== undefined) {
    textStyle.weightedFontFamily = {
      fontFamily: params.fontFamily,
    };
    fields.push('weightedFontFamily');
    appliedStyles.push(`fontFamily: ${params.fontFamily}`);
  }

  if (params.foregroundColor !== undefined) {
    const rgb = parseHexColor(params.foregroundColor);
    if (!rgb) {
      throw createInvalidParamsError('foregroundColor must be a valid hex color (e.g., "#FF0000")');
    }
    textStyle.foregroundColor = {
      color: { rgbColor: rgb },
    };
    fields.push('foregroundColor');
    appliedStyles.push(`foregroundColor: ${params.foregroundColor}`);
  }

  if (params.backgroundColor !== undefined) {
    const rgb = parseHexColor(params.backgroundColor);
    if (!rgb) {
      throw createInvalidParamsError('backgroundColor must be a valid hex color (e.g., "#FFFF00")');
    }
    textStyle.backgroundColor = {
      color: { rgbColor: rgb },
    };
    fields.push('backgroundColor');
    appliedStyles.push(`backgroundColor: ${params.backgroundColor}`);
  }

  if (params.link !== undefined) {
    textStyle.link = {
      url: params.link,
    };
    fields.push('link');
    appliedStyles.push(`link: ${params.link}`);
  }

  if (fields.length === 0) {
    throw createInvalidParamsError('At least one formatting option must be specified');
  }

  try {
    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            updateTextStyle: {
              range: {
                startIndex: params.startIndex,
                endIndex: params.endIndex,
              },
              textStyle,
              fields: fields.join(','),
            },
          },
        ],
      },
    });

    logger.info(`[gdocsFormatText] Text formatted successfully, applied: ${appliedStyles.join(', ')}`);

    return {
      success: true,
      documentId: params.documentId,
      formattedRange: {
        startIndex: params.startIndex,
        endIndex: params.endIndex,
      },
      appliedStyles,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsFormatText');
  }
}

/**
 * Apply paragraph formatting to a range in a Google Docs document
 */
export async function formatParagraph(params: FormatParagraphParams): Promise<FormatParagraphResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.startIndex, 'startIndex');
  validateIndexOrThrow(params.endIndex, 'endIndex');

  if (params.startIndex >= params.endIndex) {
    throw createInvalidParamsError('startIndex must be less than endIndex');
  }

  logger.info('[gdocsFormatParagraph] Formatting paragraph', {
    documentId: params.documentId,
    startIndex: params.startIndex,
    endIndex: params.endIndex,
  });

  const docs = getDocsClient();
  const appliedStyles: string[] = [];

  // Build paragraph style object
  const paragraphStyle: docs_v1.Schema$ParagraphStyle = {};
  const fields: string[] = [];

  if (params.alignment !== undefined) {
    paragraphStyle.alignment = params.alignment;
    fields.push('alignment');
    appliedStyles.push(`alignment: ${params.alignment}`);
  }

  if (params.namedStyleType !== undefined) {
    paragraphStyle.namedStyleType = params.namedStyleType;
    fields.push('namedStyleType');
    appliedStyles.push(`namedStyleType: ${params.namedStyleType}`);
  }

  if (params.lineSpacing !== undefined) {
    if (params.lineSpacing < 50 || params.lineSpacing > 500) {
      throw createInvalidParamsError('lineSpacing must be between 50 and 500 (percentage, 100 = single spacing)');
    }
    paragraphStyle.lineSpacing = params.lineSpacing;
    fields.push('lineSpacing');
    appliedStyles.push(`lineSpacing: ${params.lineSpacing}%`);
  }

  if (params.spaceAbove !== undefined) {
    if (params.spaceAbove < 0 || params.spaceAbove > 500) {
      throw createInvalidParamsError('spaceAbove must be between 0 and 500 points');
    }
    paragraphStyle.spaceAbove = {
      magnitude: params.spaceAbove,
      unit: 'PT',
    };
    fields.push('spaceAbove');
    appliedStyles.push(`spaceAbove: ${params.spaceAbove}pt`);
  }

  if (params.spaceBelow !== undefined) {
    if (params.spaceBelow < 0 || params.spaceBelow > 500) {
      throw createInvalidParamsError('spaceBelow must be between 0 and 500 points');
    }
    paragraphStyle.spaceBelow = {
      magnitude: params.spaceBelow,
      unit: 'PT',
    };
    fields.push('spaceBelow');
    appliedStyles.push(`spaceBelow: ${params.spaceBelow}pt`);
  }

  if (params.indentFirstLine !== undefined) {
    if (params.indentFirstLine < 0 || params.indentFirstLine > 500) {
      throw createInvalidParamsError('indentFirstLine must be between 0 and 500 points');
    }
    paragraphStyle.indentFirstLine = {
      magnitude: params.indentFirstLine,
      unit: 'PT',
    };
    fields.push('indentFirstLine');
    appliedStyles.push(`indentFirstLine: ${params.indentFirstLine}pt`);
  }

  if (params.indentStart !== undefined) {
    if (params.indentStart < 0 || params.indentStart > 500) {
      throw createInvalidParamsError('indentStart must be between 0 and 500 points');
    }
    paragraphStyle.indentStart = {
      magnitude: params.indentStart,
      unit: 'PT',
    };
    fields.push('indentStart');
    appliedStyles.push(`indentStart: ${params.indentStart}pt`);
  }

  if (fields.length === 0) {
    throw createInvalidParamsError('At least one formatting option must be specified');
  }

  try {
    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            updateParagraphStyle: {
              range: {
                startIndex: params.startIndex,
                endIndex: params.endIndex,
              },
              paragraphStyle,
              fields: fields.join(','),
            },
          },
        ],
      },
    });

    logger.info(`[gdocsFormatParagraph] Paragraph formatted successfully, applied: ${appliedStyles.join(', ')}`);

    return {
      success: true,
      documentId: params.documentId,
      formattedRange: {
        startIndex: params.startIndex,
        endIndex: params.endIndex,
      },
      appliedStyles,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsFormatParagraph');
  }
}
