/**
 * Google Docs Markdown Tools
 * Write and append Markdown content to Google Docs documents
 */

import { getDocsClient, markdownToRequests, getDocumentEndIndex } from './common.js';
import { handleGoogleDocsError, validateDocumentIdOrThrow, createInvalidParamsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface WriteMarkdownParams {
  documentId: string;
  markdown: string;
}

export interface WriteMarkdownResult {
  success: boolean;
  documentId: string;
  contentLength: number;
}

export interface AppendMarkdownParams {
  documentId: string;
  markdown: string;
}

export interface AppendMarkdownResult {
  success: boolean;
  documentId: string;
  appendedLength: number;
  newEndIndex: number;
}

/**
 * Replace entire document content with Markdown
 */
export async function writeMarkdown(params: WriteMarkdownParams): Promise<WriteMarkdownResult> {
  validateDocumentIdOrThrow(params.documentId);

  if (!params.markdown && params.markdown !== '') {
    throw createInvalidParamsError('markdown content is required');
  }

  logger.info('[gdocsWriteMarkdown] Writing markdown to document', {
    documentId: params.documentId,
    markdownLength: params.markdown.length,
  });

  const docs = getDocsClient();

  try {
    // First, get the document to find the content range
    const docResponse = await docs.documents.get({
      documentId: params.documentId,
    });

    const document = docResponse.data;
    const endIndex = getDocumentEndIndex(document);

    const requests: any[] = [];

    // Delete all existing content if there is any (keep index 1 for insertion)
    if (endIndex > 1) {
      requests.push({
        deleteContentRange: {
          range: {
            startIndex: 1,
            endIndex: endIndex,
          },
        },
      });
    }

    // Convert markdown to requests and insert at index 1
    if (params.markdown.trim()) {
      const { requests: insertRequests } = markdownToRequests(params.markdown, 1);
      requests.push(...insertRequests);
    }

    // Execute all requests
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: params.documentId,
        requestBody: {
          requests,
        },
      });
    }

    logger.info(`[gdocsWriteMarkdown] Document content replaced, length: ${params.markdown.length}`);

    return {
      success: true,
      documentId: params.documentId,
      contentLength: params.markdown.length,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsWriteMarkdown');
  }
}

/**
 * Append Markdown content to the end of a document
 */
export async function appendMarkdown(params: AppendMarkdownParams): Promise<AppendMarkdownResult> {
  validateDocumentIdOrThrow(params.documentId);

  if (!params.markdown) {
    throw createInvalidParamsError('markdown content is required and cannot be empty');
  }

  logger.info('[gdocsAppendMarkdown] Appending markdown to document', {
    documentId: params.documentId,
    markdownLength: params.markdown.length,
  });

  const docs = getDocsClient();

  try {
    // Get the document to find the end index
    const docResponse = await docs.documents.get({
      documentId: params.documentId,
    });

    const document = docResponse.data;
    const endIndex = getDocumentEndIndex(document);

    // Add a newline before appending if document has content
    const contentToAppend = endIndex > 1 ? '\n' + params.markdown : params.markdown;

    // Convert markdown to requests
    const { requests, endIndex: newEndIndex } = markdownToRequests(contentToAppend, endIndex);

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: params.documentId,
        requestBody: {
          requests,
        },
      });
    }

    logger.info(`[gdocsAppendMarkdown] Content appended, new end index: ${newEndIndex}`);

    return {
      success: true,
      documentId: params.documentId,
      appendedLength: params.markdown.length,
      newEndIndex,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsAppendMarkdown');
  }
}
