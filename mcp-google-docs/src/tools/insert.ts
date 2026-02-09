/**
 * Google Docs Insert Tools
 * Insert tables and images into Google Docs documents
 */

import { getDocsClient } from './common.js';
import {
  handleGoogleDocsError,
  validateDocumentIdOrThrow,
  validateIndexOrThrow,
  createInvalidParamsError
} from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface InsertTableParams {
  documentId: string;
  index: number;
  rows: number;
  columns: number;
}

export interface InsertTableResult {
  success: boolean;
  documentId: string;
  tableLocation: number;
  dimensions: {
    rows: number;
    columns: number;
  };
}

export interface InsertImageParams {
  documentId: string;
  index: number;
  imageUrl: string;
  width?: number;
  height?: number;
}

export interface InsertImageResult {
  success: boolean;
  documentId: string;
  imageLocation: number;
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Insert a table at a specific position in a Google Docs document
 */
export async function insertTable(params: InsertTableParams): Promise<InsertTableResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.index, 'index');

  if (!Number.isInteger(params.rows) || params.rows < 1 || params.rows > 100) {
    throw createInvalidParamsError('rows must be an integer between 1 and 100');
  }

  if (!Number.isInteger(params.columns) || params.columns < 1 || params.columns > 20) {
    throw createInvalidParamsError('columns must be an integer between 1 and 20');
  }

  logger.info('[gdocsInsertTable] Inserting table', {
    documentId: params.documentId,
    index: params.index,
    rows: params.rows,
    columns: params.columns,
  });

  const docs = getDocsClient();

  try {
    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            insertTable: {
              location: {
                index: params.index,
              },
              rows: params.rows,
              columns: params.columns,
            },
          },
        ],
      },
    });

    logger.info(`[gdocsInsertTable] Table inserted successfully: ${params.rows}x${params.columns}`);

    return {
      success: true,
      documentId: params.documentId,
      tableLocation: params.index,
      dimensions: {
        rows: params.rows,
        columns: params.columns,
      },
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsInsertTable');
  }
}

/**
 * Insert an image from URL at a specific position in a Google Docs document
 */
export async function insertImage(params: InsertImageParams): Promise<InsertImageResult> {
  validateDocumentIdOrThrow(params.documentId);
  validateIndexOrThrow(params.index, 'index');

  if (!params.imageUrl || typeof params.imageUrl !== 'string') {
    throw createInvalidParamsError('imageUrl is required and must be a string');
  }

  // Validate URL format
  try {
    const url = new URL(params.imageUrl);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw createInvalidParamsError('imageUrl must use http or https protocol');
    }
  } catch (e) {
    if (e instanceof TypeError) {
      throw createInvalidParamsError('imageUrl must be a valid URL');
    }
    throw e;
  }

  // Validate dimensions if provided
  if (params.width !== undefined) {
    if (typeof params.width !== 'number' || params.width <= 0 || params.width > 10000) {
      throw createInvalidParamsError('width must be a positive number up to 10000 points');
    }
  }

  if (params.height !== undefined) {
    if (typeof params.height !== 'number' || params.height <= 0 || params.height > 10000) {
      throw createInvalidParamsError('height must be a positive number up to 10000 points');
    }
  }

  logger.info('[gdocsInsertImage] Inserting image', {
    documentId: params.documentId,
    index: params.index,
    imageUrl: params.imageUrl.substring(0, 50) + '...',
    width: params.width,
    height: params.height,
  });

  const docs = getDocsClient();

  try {
    // Build the insert image request
    const insertInlineImageRequest: any = {
      location: {
        index: params.index,
      },
      uri: params.imageUrl,
    };

    // Add object size if dimensions are specified
    if (params.width !== undefined || params.height !== undefined) {
      insertInlineImageRequest.objectSize = {};

      if (params.width !== undefined) {
        insertInlineImageRequest.objectSize.width = {
          magnitude: params.width,
          unit: 'PT',
        };
      }

      if (params.height !== undefined) {
        insertInlineImageRequest.objectSize.height = {
          magnitude: params.height,
          unit: 'PT',
        };
      }
    }

    await docs.documents.batchUpdate({
      documentId: params.documentId,
      requestBody: {
        requests: [
          {
            insertInlineImage: insertInlineImageRequest,
          },
        ],
      },
    });

    logger.info('[gdocsInsertImage] Image inserted successfully');

    const result: InsertImageResult = {
      success: true,
      documentId: params.documentId,
      imageLocation: params.index,
    };

    if (params.width !== undefined || params.height !== undefined) {
      result.dimensions = {
        width: params.width || 0,
        height: params.height || 0,
      };
    }

    return result;
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsInsertImage');
  }
}
