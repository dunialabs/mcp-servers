/**
 * Google Drive Resource URI Handler
 * Implements: gdrive:///fileId - Read file contents via Resource URI
 */

import { getDriveClient, getExportMimeType, isGoogleWorkspaceFile, formatBytes, validateFileId } from '../tools/common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError, GoogleDriveErrorCode, createMcpError } from '../utils/errors.js';

/**
 * Parse Resource URI
 * Expected format: gdrive:///fileId or gdrive://fileId
 */
export function parseResourceUri(uri: string): string {
  const match = uri.match(/^gdrive:\/\/\/?(.+)$/);
  if (!match) {
    throw createInvalidParamsError(`Invalid Resource URI format: ${uri}. Expected: gdrive:///fileId`);
  }
  const fileId = match[1];

  // Check for URI template (unreplaced parameter)
  if (fileId === '{fileId}' || fileId.includes('{') || fileId.includes('}')) {
    throw createInvalidParamsError(
      'Cannot read resource template directly. ' +
      'Please replace {fileId} with an actual Google Drive file ID. ' +
      'Example: gdrive:///1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'
    );
  }

  // Check for wildcard (legacy format)
  if (fileId === '*' || fileId.includes('*')) {
    throw createInvalidParamsError(
      'Wildcard URIs are not supported. ' +
      'Use resources/list to discover available files, then use a specific file ID. ' +
      'Example: gdrive:///1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs'
    );
  }

  // Validate parsed fileId
  validateFileId(fileId, 'fileId');

  return fileId;
}

/**
 * Read file via Resource URI
 */
export async function readFileResource(uri: string) {
  const fileId = parseResourceUri(uri);
  const drive = getDriveClient();

  logger.debug(`[Resource] Reading file: ${fileId}`);

  try {
    // Get file metadata
    const metadataResponse = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, modifiedTime, owners, webViewLink, description',
    });

    const file = metadataResponse.data;

    logger.debug(`[Resource] File: ${file.name} (${file.mimeType})`);

    // Get file content
    let content: string;
    let mimeType: string;

    if (isGoogleWorkspaceFile(file.mimeType!)) {
      // Export Google Workspace files
      const exportMimeType = getExportMimeType(file.mimeType!);

      if (!exportMimeType) {
        throw createInvalidParamsError(`Cannot export Google Workspace file type: ${file.mimeType}`);
      }

      logger.debug(`[Resource] Exporting as ${exportMimeType}`);

      const exportResponse = await drive.files.export(
        { fileId: fileId, mimeType: exportMimeType },
        { responseType: 'text' }
      );

      content = exportResponse.data as string;
      mimeType = exportMimeType;
    } else {
      // Download binary/text files
      logger.debug('[Resource] Downloading file');

      // Check file size
      const fileSize = file.size ? parseInt(file.size) : 0;
      const maxSize = 10 * 1024 * 1024; // 10 MB

      if (fileSize > maxSize) {
        throw createMcpError(
          GoogleDriveErrorCode.FileSizeTooLarge,
          `File too large (${formatBytes(fileSize)}). Maximum size: 10 MB. ` +
          `Please download via web: ${file.webViewLink}`
        );
      }

      const downloadResponse = await drive.files.get(
        { fileId: fileId, alt: 'media' },
        { responseType: 'text' }
      );

      content = downloadResponse.data as string;
      mimeType = file.mimeType || 'application/octet-stream';
    }

    logger.debug(`[Resource] Retrieved ${content.length} characters`);

    // Return resource content
    return {
      contents: [
        {
          uri: uri,
          mimeType: mimeType,
          text: content,
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to read file resource');
  }
}

/**
 * List all available resources (My Drive root files)
 * This is called when client requests resource list
 */
export async function listFileResources() {
  const drive = getDriveClient();

  logger.debug('[Resource] Listing available resources');

  try {
    const response = await drive.files.list({
      q: "trashed=false and ('root' in parents or sharedWithMe=true)",
      pageSize: 50,
      fields: 'files(id, name, mimeType, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];

    logger.debug(`[Resource] Found ${files.length} resources`);

    return {
      resources: files.map(file => ({
        uri: `gdrive:///${file.id}`,
        name: file.name!,
        description: `${file.name} (${file.mimeType})`,
        mimeType: file.mimeType || undefined,
      })),
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to list file resources');
  }
}
