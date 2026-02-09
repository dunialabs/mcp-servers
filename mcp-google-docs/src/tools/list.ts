/**
 * Google Docs List and Search Tools
 * Uses Google Drive API to list and search Google Docs files
 */

import { getDriveClient, buildDocumentQuery, GOOGLE_DOCS_MIME_TYPE } from './common.js';
import { handleGoogleDocsError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export interface ListDocumentsParams {
  maxResults?: number;
  pageToken?: string;
  orderBy?: 'modifiedTime' | 'createdTime' | 'name';
  orderDirection?: 'asc' | 'desc';
}

export interface SearchDocumentsParams {
  query: string;
  maxResults?: number;
  pageToken?: string;
  modifiedAfter?: string;
  createdAfter?: string;
  owner?: string;
  inFolder?: string;
}

export interface DocumentInfo {
  id: string;
  name: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: string[];
  webViewLink?: string;
}

export interface ListDocumentsResult {
  documents: DocumentInfo[];
  nextPageToken?: string;
  /** Number of documents returned in this page (not total matching documents) */
  count: number;
  /** Whether there are more results available */
  hasMore: boolean;
}

/**
 * List user's Google Docs documents
 */
export async function listDocuments(params: ListDocumentsParams): Promise<ListDocumentsResult> {
  logger.info('[gdocsListDocuments] Listing documents', params);

  const drive = getDriveClient();
  const maxResults = Math.min(params.maxResults || 20, 100);
  const orderBy = params.orderBy || 'modifiedTime';
  const orderDirection = params.orderDirection || 'desc';

  try {
    const response = await drive.files.list({
      q: `mimeType='${GOOGLE_DOCS_MIME_TYPE}' and trashed=false`,
      pageSize: maxResults,
      pageToken: params.pageToken,
      orderBy: `${orderBy} ${orderDirection}`,
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, owners, webViewLink)',
    });

    const files = response.data.files || [];
    const documents: DocumentInfo[] = files.map(file => ({
      id: file.id!,
      name: file.name!,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      owners: file.owners?.map(o => o.emailAddress || o.displayName || 'Unknown') || [],
      webViewLink: file.webViewLink || undefined,
    }));

    logger.info(`[gdocsListDocuments] Found ${documents.length} documents`);

    return {
      documents,
      nextPageToken: response.data.nextPageToken || undefined,
      count: documents.length,
      hasMore: !!response.data.nextPageToken,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsListDocuments');
  }
}

/**
 * Search Google Docs documents
 */
export async function searchDocuments(params: SearchDocumentsParams): Promise<ListDocumentsResult> {
  logger.info('[gdocsSearchDocuments] Searching documents', { query: params.query });

  const drive = getDriveClient();
  const maxResults = Math.min(params.maxResults || 20, 100);

  try {
    const query = buildDocumentQuery({
      query: params.query,
      modifiedAfter: params.modifiedAfter,
      createdAfter: params.createdAfter,
      owner: params.owner,
      inFolder: params.inFolder,
    });

    logger.debug('[gdocsSearchDocuments] Drive query:', query);

    const response = await drive.files.list({
      q: query,
      pageSize: maxResults,
      pageToken: params.pageToken,
      orderBy: 'modifiedTime desc',
      fields: 'nextPageToken, files(id, name, createdTime, modifiedTime, owners, webViewLink)',
    });

    const files = response.data.files || [];
    const documents: DocumentInfo[] = files.map(file => ({
      id: file.id!,
      name: file.name!,
      createdTime: file.createdTime || undefined,
      modifiedTime: file.modifiedTime || undefined,
      owners: file.owners?.map(o => o.emailAddress || o.displayName || 'Unknown') || [],
      webViewLink: file.webViewLink || undefined,
    }));

    logger.info(`[gdocsSearchDocuments] Found ${documents.length} documents for query: "${params.query}"`);

    return {
      documents,
      nextPageToken: response.data.nextPageToken || undefined,
      count: documents.length,
      hasMore: !!response.data.nextPageToken,
    };
  } catch (error) {
    throw handleGoogleDocsError(error, 'gdocsSearchDocuments');
  }
}
