/**
 * Google Docs Document Tools
 * Create and read Google Docs documents
 */

import { getDocsClient, documentToMarkdown, markdownToRequests } from './common.js';
import { handleGoogleDocsError, validateDocumentIdOrThrow } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface CreateDocumentParams {
  title: string;
  content?: string;
}

export interface CreateDocumentResult {
  documentId: string;
  title: string;
  webViewLink: string;
}

export interface ReadDocumentParams {
  documentId: string;
  format?: 'markdown' | 'text' | 'json';
}

export interface ReadDocumentResult {
  documentId: string;
  title: string;
  content: string;
  format: string;
  revisionId?: string;
}

/**
 * Create a new Google Docs document
 */
export async function createDocument(params: CreateDocumentParams): Promise<CreateDocumentResult> {
  logger.info('[gdocsCreateDocument] Creating document', { title: params.title });

  const docs = getDocsClient();

  try {
    // Create blank document
    const createResponse = await docs.documents.create({
      requestBody: {
        title: params.title,
      },
    });

    const documentId = createResponse.data.documentId!;
    logger.info(`[gdocsCreateDocument] Document created with ID: ${documentId}`);

    // If initial content provided, add it
    if (params.content && params.content.trim()) {
      const { requests } = markdownToRequests(params.content, 1);

      if (requests.length > 0) {
        await docs.documents.batchUpdate({
          documentId,
          requestBody: {
            requests,
          },
        });
        logger.debug('[gdocsCreateDocument] Initial content added');
      }
    }

    const webViewLink = `https://docs.google.com/document/d/${documentId}/edit`;

    return {
      documentId,
      title: params.title,
      webViewLink,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsCreateDocument');
  }
}

/**
 * Read a Google Docs document
 */
export async function readDocument(params: ReadDocumentParams): Promise<ReadDocumentResult> {
  validateDocumentIdOrThrow(params.documentId);

  const format = params.format || 'markdown';
  logger.info('[gdocsReadDocument] Reading document', { documentId: params.documentId, format });

  const docs = getDocsClient();

  try {
    const response = await docs.documents.get({
      documentId: params.documentId,
    });

    const document = response.data;
    let content: string;

    switch (format) {
      case 'json':
        content = JSON.stringify(document, null, 2);
        break;
      case 'text':
        content = extractPlainText(document);
        break;
      case 'markdown':
      default:
        content = documentToMarkdown(document);
        break;
    }

    logger.info(`[gdocsReadDocument] Document read successfully, format: ${format}`);

    return {
      documentId: params.documentId,
      title: document.title || 'Untitled',
      content,
      format,
      revisionId: document.revisionId || undefined,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsReadDocument');
  }
}

/**
 * Extract plain text from Google Docs document
 */
function extractPlainText(document: any): string {
  const body = document.body;
  if (!body?.content) {
    return '';
  }

  const lines: string[] = [];

  for (const element of body.content) {
    if (element.paragraph) {
      const paragraph = element.paragraph;
      const elements = paragraph.elements || [];
      let text = '';

      for (const elem of elements) {
        if (elem.textRun) {
          text += elem.textRun.content || '';
        }
      }

      lines.push(text);
    } else if (element.table) {
      // Extract text from table cells
      const rows = element.table.tableRows || [];
      for (const row of rows) {
        const cells = row.tableCells || [];
        const cellTexts: string[] = [];
        for (const cell of cells) {
          let cellText = '';
          for (const content of cell.content || []) {
            if (content.paragraph) {
              for (const elem of content.paragraph.elements || []) {
                if (elem.textRun) {
                  cellText += elem.textRun.content || '';
                }
              }
            }
          }
          cellTexts.push(cellText.trim());
        }
        lines.push(cellTexts.join('\t'));
      }
    }
  }

  // Strip trailing newlines from each line, then join with newlines to preserve structure
  return lines.map(line => line.replace(/\n+$/, '')).join('\n');
}
