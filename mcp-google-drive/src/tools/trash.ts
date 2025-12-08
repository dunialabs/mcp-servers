/**
 * Google Drive Trash Management
 * Tools for managing trashed files
 */

import { getDriveClient, formatBytes, validateFileId } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError } from '../utils/errors.js';

/**
 * Tool 8: List Trash
 * List all files in the trash
 */
export interface ListTrashParams {
  limit?: number;  // Maximum number of results (default: 50)
}

export async function listTrash(params: ListTrashParams) {
  const drive = getDriveClient();
  const { limit = 50 } = params;

  logger.debug('[ListTrash] Listing trashed files');

  try {
    const response = await drive.files.list({
      q: 'trashed=true',
      pageSize: limit,
      fields: 'files(id, name, mimeType, size, trashedTime, trashed, explicitlyTrashed, owners, parents)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];

    logger.debug(`[ListTrash] Found ${files.length} trashed files`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            totalResults: files.length,
            files: files.map(file => ({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatBytes(parseInt(file.size)) : 'N/A',
              trashedTime: file.trashedTime,
              explicitlyTrashed: file.explicitlyTrashed,
              owners: file.owners?.map(o => o.displayName || o.emailAddress).join(', '),
              parents: file.parents || [],
              resourceUri: `gdrive:///${file.id}`,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to list trash');
  }
}

/**
 * Tool 9: Restore from Trash
 * Restore a file from trash
 */
export interface RestoreFromTrashParams {
  fileId: string;  // File ID to restore (required)
}

export async function restoreFromTrash(params: RestoreFromTrashParams) {
  const drive = getDriveClient();
  const { fileId } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[RestoreFromTrash] Restoring file: ${fileId}`);

  try {
    // First check if file is in trash
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, trashed, trashedTime',
    });

    if (!fileInfo.data.trashed) {
      throw createInvalidParamsError('File is not in trash');
    }

    // Restore file by setting trashed=false
    const response = await drive.files.update({
      fileId: fileId,
      requestBody: {
        trashed: false,
      },
      fields: 'id, name, mimeType, size, modifiedTime, parents, trashed, webViewLink',
    });

    const file = response.data;

    logger.debug(`[RestoreFromTrash] Restored file: ${file.name} (${file.id})`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File restored from trash',
            file: {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatBytes(parseInt(file.size)) : 'N/A',
              modifiedTime: file.modifiedTime,
              parents: file.parents || [],
              webViewLink: file.webViewLink,
              resourceUri: `gdrive:///${file.id}`,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to restore file');
  }
}

/**
 * Tool 10: Empty Trash
 * Permanently delete all files in trash (cannot be undone)
 */
export interface EmptyTrashParams {
  confirm?: boolean;  // Confirmation flag (default: false)
}

export async function emptyTrash(params: EmptyTrashParams) {
  const drive = getDriveClient();
  const { confirm = false } = params;

  logger.debug('[EmptyTrash] Attempting to empty trash');

  if (!confirm) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: false,
            error: 'Confirmation required',
            message: 'To empty trash, you must set confirm=true. This action cannot be undone.',
            warning: 'All files in trash will be permanently deleted',
          }, null, 2),
        },
      ],
    };
  }

  try {
    // First get count of files in trash
    const listResponse = await drive.files.list({
      q: 'trashed=true',
      pageSize: 1000,
      fields: 'files(id, name)',
    });

    const trashedFiles = listResponse.data.files || [];
    const count = trashedFiles.length;

    if (count === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: 'Trash is already empty',
              filesDeleted: 0,
            }, null, 2),
          },
        ],
      };
    }

    // Empty trash
    await drive.files.emptyTrash();

    logger.debug(`[EmptyTrash] Emptied trash, deleted ${count} files`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Trash emptied successfully',
            filesDeleted: count,
            warning: 'All files have been permanently deleted and cannot be recovered',
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to empty trash');
  }
}
