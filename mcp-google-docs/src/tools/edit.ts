/**
 * Google Docs Edit Tools
 * Insert, replace, and delete content in Google Docs documents
 */

import { getDocsClient } from './common.js';
import {
  handleGoogleDocsError,
  validateDocumentIdOrThrow,
  validateIndexOrThrow,
  createInvalidParamsError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface InsertTextParams {
  documentId: string;
  text: string;
  index: number;
}

export interface InsertTextResult {
  success: boolean;
  documentId: string;
  insertedLength: number;
}

export interface ReplaceTextParams {
  documentId: string;
  searchText: string;
  replaceText: string;
  matchCase?: boolean;
}

export interface ReplaceTextResult {
  success: boolean;
  documentId: string;
  replacementsCount: number;
}

export interface DeleteRangeParams {
  documentId: string;
  startIndex: number;
  endIndex: number;
}

export interface DeleteRangeResult {
  success: boolean;
  documentId: string;
  deletedLength: number;
}

/**
 * Insert text at a specific position in a Google Docs document
 */
export async function insertText(params: InsertTextParams): Promise<InsertTextResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.index, 'index');

  if (!params.text) {
    throw createInvalidParamsError('text is required and cannot be empty');
  }

  logger.info('[gdocsInsertText] Inserting text', {
    documentId: params.documentId,
    index: params.index,
    textLength: params.text.length,
  });

  const docs = getDocsClient();

  try {
    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: {
                index: params.index,
              },
              text: params.text,
            },
          },
        ],
      },
    });

    logger.info(`[gdocsInsertText] Text inserted successfully, length: ${params.text.length}`);

    return {
      success: true,
      documentId: params.documentId,
      insertedLength: params.text.length,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsInsertText');
  }
}

/**
 * Replace all occurrences of text in a Google Docs document
 */
export async function replaceText(params: ReplaceTextParams): Promise<ReplaceTextResult> {
  validateDocumentIdOrThrow(params.documentId);

  if (!params.searchText) {
    throw createInvalidParamsError('searchText is required and cannot be empty');
  }

  logger.info('[gdocsReplaceText] Replacing text', {
    documentId: params.documentId,
    searchText: params.searchText,
    replaceText: params.replaceText,
    matchCase: params.matchCase,
  });

  const docs = getDocsClient();

  try {
    const response = await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            replaceAllText: {
              containsText: {
                text: params.searchText,
                matchCase: params.matchCase ?? false,
              },
              replaceText: params.replaceText,
            },
          },
        ],
      },
    });

    // Get the number of replacements from the response
    const replies = response.data.replies || [];
    let replacementsCount = 0;
    for (const reply of replies) {
      if (reply.replaceAllText?.occurrencesChanged) {
        replacementsCount += reply.replaceAllText.occurrencesChanged;
      }
    }

    logger.info(`[gdocsReplaceText] Replaced ${replacementsCount} occurrences`);

    return {
      success: true,
      documentId: params.documentId,
      replacementsCount,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsReplaceText');
  }
}

/**
 * Delete content in a specific range of a Google Docs document
 */
export async function deleteRange(params: DeleteRangeParams): Promise<DeleteRangeResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.startIndex, 'startIndex');
  validateIndexOrThrow(params.endIndex, 'endIndex');

  if (params.startIndex >= params.endIndex) {
    throw createInvalidParamsError('startIndex must be less than endIndex');
  }

  const deletedLength = params.endIndex - params.startIndex;

  logger.info('[gdocsDeleteRange] Deleting range', {
    documentId: params.documentId,
    startIndex: params.startIndex,
    endIndex: params.endIndex,
    deletedLength,
  });

  const docs = getDocsClient();

  try {
    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            deleteContentRange: {
              range: {
                startIndex: params.startIndex,
                endIndex: params.endIndex,
              },
            },
          },
        ],
      },
    });

    logger.info(`[gdocsDeleteRange] Deleted ${deletedLength} characters`);

    return {
      success: true,
      documentId: params.documentId,
      deletedLength,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsDeleteRange');
  }
}
