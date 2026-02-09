/**
 * Common utilities for Google Docs tools
 */

import { google } from 'googleapis';
import { getCurrentToken } from '../auth/token.js';
import type { docs_v1 } from 'googleapis';
import type { drive_v3 } from 'googleapis';

/**
 * Initialize Google Docs API client
 */
export function getDocsClient(): docs_v1.Docs {
  const token = getCurrentToken();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  return google.docs({ version: 'v1', auth });
}

/**
 * Initialize Google Drive API client (for listing/searching documents)
 */
export function getDriveClient(): drive_v3.Drive {
  const token = getCurrentToken();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  return google.drive({ version: 'v3', auth });
}

/**
 * Google Docs MIME type constant
 */
export const GOOGLE_DOCS_MIME_TYPE = 'application/vnd.google-apps.document';

/**
 * Build Google Drive query for searching documents
 */
export function buildDocumentQuery(params: {
  query?: string;
  modifiedAfter?: string;
  createdAfter?: string;
  owner?: string;
  inFolder?: string;
  trashed?: boolean;
}): string {
  const conditions: string[] = [];

  // Only Google Docs files
  conditions.push(`mimeType='${GOOGLE_DOCS_MIME_TYPE}'`);

  // Text query (searches title and content)
  if (params.query) {
    conditions.push(`fullText contains '${params.query.replace(/'/g, "\\'")}'`);
  }

  // Modified date filter
  if (params.modifiedAfter) {
    conditions.push(`modifiedTime > '${params.modifiedAfter}'`);
  }

  // Created date filter
  if (params.createdAfter) {
    conditions.push(`createdTime > '${params.createdAfter}'`);
  }

  // Owner filter
  if (params.owner) {
    conditions.push(`'${params.owner.replace(/'/g, "\\'")}' in owners`);
  }

  // Folder filter
  if (params.inFolder) {
    conditions.push(`'${params.inFolder.replace(/'/g, "\\'")}' in parents`);
  }

  // Trashed filter
  if (params.trashed !== undefined) {
    conditions.push(`trashed=${params.trashed}`);
  } else {
    conditions.push('trashed=false');
  }

  return conditions.join(' and ');
}

/**
 * Convert Google Docs document content to Markdown
 */
export function documentToMarkdown(document: docs_v1.Schema$Document): string {
  const body = document.body;
  if (!body?.content) {
    return '';
  }

  const lines: string[] = [];

  for (const element of body.content) {
    if (element.paragraph) {
      const paragraphText = paragraphToMarkdown(element.paragraph);
      lines.push(paragraphText);
    } else if (element.table) {
      const tableText = tableToMarkdown(element.table);
      lines.push(tableText);
    } else if (element.sectionBreak) {
      lines.push('\n---\n');
    }
  }

  return lines.join('\n');
}

/**
 * Wrap text with markdown markers while preserving leading/trailing whitespace
 */
function wrapWithMarkers(content: string, prefix: string, suffix: string): string {
  // Extract leading whitespace
  const leadingMatch = content.match(/^(\s*)/);
  const leading = leadingMatch ? leadingMatch[1] : '';

  // Extract trailing whitespace
  const trailingMatch = content.match(/(\s*)$/);
  const trailing = trailingMatch ? trailingMatch[1] : '';

  // Get the trimmed content
  const trimmed = content.trim();

  // If content is only whitespace, return as-is
  if (trimmed.length === 0) {
    return content;
  }

  // Wrap trimmed content and restore whitespace
  return `${leading}${prefix}${trimmed}${suffix}${trailing}`;
}

/**
 * Convert paragraph to Markdown
 */
function paragraphToMarkdown(paragraph: docs_v1.Schema$Paragraph): string {
  const elements = paragraph.elements || [];
  let text = '';

  for (const element of elements) {
    if (element.textRun) {
      let content = element.textRun.content || '';

      // Apply text styling (preserve whitespace)
      const style = element.textRun.textStyle;
      if (style) {
        if (style.bold) {
          content = wrapWithMarkers(content, '**', '**');
        }
        if (style.italic) {
          content = wrapWithMarkers(content, '*', '*');
        }
        if (style.strikethrough) {
          content = wrapWithMarkers(content, '~~', '~~');
        }
        if (style.link?.url) {
          const trimmed = content.trim();
          if (trimmed.length > 0) {
            // For links, extract whitespace and wrap
            const leadingMatch = content.match(/^(\s*)/);
            const leading = leadingMatch ? leadingMatch[1] : '';
            const trailingMatch = content.match(/(\s*)$/);
            const trailing = trailingMatch ? trailingMatch[1] : '';
            content = `${leading}[${trimmed}](${style.link.url})${trailing}`;
          }
        }
      }

      text += content;
    } else if (element.inlineObjectElement) {
      text += '[Image]';
    }
  }

  // Apply paragraph styling (headings)
  const paragraphStyle = paragraph.paragraphStyle;
  if (paragraphStyle?.namedStyleType) {
    const styleType = paragraphStyle.namedStyleType;
    if (styleType === 'HEADING_1') {
      text = `# ${text.trim()}`;
    } else if (styleType === 'HEADING_2') {
      text = `## ${text.trim()}`;
    } else if (styleType === 'HEADING_3') {
      text = `### ${text.trim()}`;
    } else if (styleType === 'HEADING_4') {
      text = `#### ${text.trim()}`;
    } else if (styleType === 'HEADING_5') {
      text = `##### ${text.trim()}`;
    } else if (styleType === 'HEADING_6') {
      text = `###### ${text.trim()}`;
    }
  }

  // Handle bullet lists
  if (paragraph.bullet) {
    const nestingLevel = paragraph.bullet.nestingLevel || 0;
    const indent = '  '.repeat(nestingLevel);
    text = `${indent}- ${text.trim()}`;
  }

  return text;
}

/**
 * Convert table to Markdown
 */
function tableToMarkdown(table: docs_v1.Schema$Table): string {
  const rows = table.tableRows || [];
  if (rows.length === 0) return '';

  const markdownRows: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.tableCells || [];
    const cellTexts: string[] = [];

    for (const cell of cells) {
      let cellText = '';
      for (const content of cell.content || []) {
        if (content.paragraph) {
          cellText += paragraphToMarkdown(content.paragraph).trim();
        }
      }
      cellTexts.push(cellText.replace(/\|/g, '\\|'));
    }

    markdownRows.push(`| ${cellTexts.join(' | ')} |`);

    // Add header separator after first row
    if (i === 0) {
      markdownRows.push(`| ${cellTexts.map(() => '---').join(' | ')} |`);
    }
  }

  return markdownRows.join('\n');
}

/**
 * Convert Markdown to Google Docs batchUpdate requests
 */
export function markdownToRequests(
  markdown: string,
  startIndex: number = 1
): { requests: docs_v1.Schema$Request[]; endIndex: number } {
  const requests: docs_v1.Schema$Request[] = [];
  const lines = markdown.split('\n');
  let currentIndex = startIndex;

  for (const line of lines) {
    const { segments, isBullet, headingLevel } = parseLine(line);

    // Calculate total text length (without markdown markers)
    const plainText = segments.map(s => s.text).join('');

    if (plainText.length === 0 && !isBullet) {
      // Empty line - insert newline
      requests.push({
        insertText: {
          location: { index: currentIndex },
          text: '\n',
        },
      });
      currentIndex += 1;
      continue;
    }

    const insertText = plainText + '\n';
    const lineStartIndex = currentIndex;

    // Insert the text (without markdown markers)
    requests.push({
      insertText: {
        location: { index: currentIndex },
        text: insertText,
      },
    });

    // Track position for each segment to apply styles
    let segmentIndex = currentIndex;
    for (const segment of segments) {
      const segmentStart = segmentIndex;
      const segmentEnd = segmentIndex + segment.text.length;

      // Apply bold style to this segment
      if (segment.bold && segment.text.length > 0) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: segmentStart,
              endIndex: segmentEnd,
            },
            textStyle: { bold: true },
            fields: 'bold',
          },
        });
      }

      // Apply italic style to this segment
      if (segment.italic && segment.text.length > 0) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: segmentStart,
              endIndex: segmentEnd,
            },
            textStyle: { italic: true },
            fields: 'italic',
          },
        });
      }

      // Apply strikethrough style to this segment
      if (segment.strikethrough && segment.text.length > 0) {
        requests.push({
          updateTextStyle: {
            range: {
              startIndex: segmentStart,
              endIndex: segmentEnd,
            },
            textStyle: { strikethrough: true },
            fields: 'strikethrough',
          },
        });
      }

      segmentIndex = segmentEnd;
    }

    currentIndex += insertText.length;

    // Apply heading style to entire paragraph
    if (headingLevel > 0 && headingLevel <= 6) {
      requests.push({
        updateParagraphStyle: {
          range: {
            startIndex: lineStartIndex,
            endIndex: currentIndex,
          },
          paragraphStyle: {
            namedStyleType: `HEADING_${headingLevel}` as any,
          },
          fields: 'namedStyleType',
        },
      });
    }

    // Handle bullets
    if (isBullet) {
      requests.push({
        createParagraphBullets: {
          range: {
            startIndex: lineStartIndex,
            endIndex: currentIndex,
          },
          bulletPreset: 'BULLET_DISC_CIRCLE_SQUARE',
        },
      });
    }
  }

  return { requests, endIndex: currentIndex };
}

/**
 * A text segment with optional styling
 */
interface TextSegment {
  text: string;
  bold: boolean;
  italic: boolean;
  strikethrough?: boolean;
}

/**
 * Parse a single line of Markdown with inline formatting support
 */
function parseLine(line: string): {
  segments: TextSegment[];
  isBullet: boolean;
  headingLevel: number;
} {
  let text = line;
  let headingLevel = 0;
  let isBullet = false;

  // Check for headings
  const headingMatch = text.match(/^(#{1,6})\s+(.*)$/);
  if (headingMatch) {
    headingLevel = headingMatch[1].length;
    text = headingMatch[2];
  }

  // Check for bullets
  const bulletMatch = text.match(/^(\s*)[-*+]\s+(.*)$/);
  if (bulletMatch) {
    isBullet = true;
    text = bulletMatch[2];
  }

  // Parse inline formatting (bold and italic)
  const segments = parseInlineFormatting(text);

  return { segments, isBullet, headingLevel };
}

/**
 * Parse inline formatting: **bold**, *italic*, ***bold+italic***, ~~strikethrough~~
 * Returns an array of text segments with their styles
 */
function parseInlineFormatting(text: string): TextSegment[] {
  const segments: TextSegment[] = [];

  // Regex to match formatting patterns or plain text
  // Order matters: check longer patterns first
  const pattern = /(~~(.+?)~~|\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*|[^*~]+|[*~])/g;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const fullMatch = match[0];

    if (fullMatch.startsWith('~~') && fullMatch.endsWith('~~') && fullMatch.length > 4) {
      // Strikethrough
      segments.push({
        text: fullMatch.slice(2, -2),
        bold: false,
        italic: false,
        strikethrough: true,
      });
    } else if (fullMatch.startsWith('***') && fullMatch.endsWith('***') && fullMatch.length > 6) {
      // Bold + Italic
      segments.push({
        text: fullMatch.slice(3, -3),
        bold: true,
        italic: true,
      });
    } else if (fullMatch.startsWith('**') && fullMatch.endsWith('**') && fullMatch.length > 4) {
      // Bold
      segments.push({
        text: fullMatch.slice(2, -2),
        bold: true,
        italic: false,
      });
    } else if (fullMatch.startsWith('*') && fullMatch.endsWith('*') && fullMatch.length > 2) {
      // Italic (must have content between asterisks)
      segments.push({
        text: fullMatch.slice(1, -1),
        bold: false,
        italic: true,
      });
    } else {
      // Plain text (including unmatched * or ~)
      segments.push({
        text: fullMatch,
        bold: false,
        italic: false,
      });
    }
  }

  // If no matches, return the whole text as plain
  if (segments.length === 0 && text.length > 0) {
    segments.push({ text, bold: false, italic: false });
  }

  return segments;
}

/**
 * Get document end index (for appending content)
 */
export function getDocumentEndIndex(document: docs_v1.Schema$Document): number {
  const body = document.body;
  if (!body?.content || body.content.length === 0) {
    return 1;
  }

  const lastElement = body.content[body.content.length - 1];
  return lastElement.endIndex ? lastElement.endIndex - 1 : 1;
}
