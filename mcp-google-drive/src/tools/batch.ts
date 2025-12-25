/**
 * Google Drive Batch Operations
 * Tools for folder statistics and batch file operations
 */

import { getDriveClient, formatBytes, validateFileId } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError, validateFolderOrThrow } from '../utils/errors.js';

/**
 * Tool 11: Get Folder Statistics
 * Get statistics about a folder (size, file count, folder count)
 */
export interface GetFolderStatsParams {
  folderId?: string;  // Folder ID (optional, defaults to root)
  recursive?: boolean;  // Include subfolders (default: true)
}

export async function getFolderStats(params: GetFolderStatsParams) {
  const drive = getDriveClient();
  const { folderId = 'root', recursive = true } = params;

  // Validate folderId
  validateFileId(folderId, 'folderId');

  logger.debug(`[FolderStats] Getting statistics for folder: ${folderId}`);

  try {
    // Get folder info
    const folderInfo = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType',
    });

    if (folderInfo.data.mimeType !== 'application/vnd.google-apps.folder' && folderId !== 'root') {
      throw validateFolderOrThrow(folderInfo.data.mimeType!, folderId);
    }

    let totalSize = 0;
    let fileCount = 0;
    let folderCount = 0;
    const fileTypes: Record<string, number> = {};

    // Recursive function to count files
    const processFolder = async (currentFolderId: string): Promise<void> => {
      let pageToken: string | undefined = undefined;
      let hasMore = true;

      while (hasMore) {
        const response: any = await drive.files.list({
          q: `'${currentFolderId}' in parents and trashed=false`,
          pageSize: 1000,
          fields: 'nextPageToken, files(id, name, mimeType, size)',
          pageToken: pageToken,
        });

        const files = response.data.files || [];

        for (const file of files) {
          if (file.mimeType === 'application/vnd.google-apps.folder') {
            folderCount++;
            if (recursive) {
              await processFolder(file.id!);
            }
          } else {
            fileCount++;
            if (file.size) {
              totalSize += parseInt(file.size);
            }

            // Count by file type
            const mimeType = file.mimeType || 'unknown';
            fileTypes[mimeType] = (fileTypes[mimeType] || 0) + 1;
          }
        }

        pageToken = response.data.nextPageToken || undefined;
        hasMore = !!pageToken;
      }
    }

    await processFolder(folderId);

    logger.debug(`[FolderStats] Processed ${fileCount} files, ${folderCount} folders`);

    // Sort file types by count
    const sortedFileTypes = Object.entries(fileTypes)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)  // Top 10 file types
      .map(([mimeType, count]) => ({ mimeType, count }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            folder: {
              id: folderInfo.data.id,
              name: folderInfo.data.name,
            },
            statistics: {
              totalSize: formatBytes(totalSize),
              totalSizeBytes: totalSize,
              fileCount: fileCount,
              folderCount: folderCount,
              recursive: recursive,
            },
            topFileTypes: sortedFileTypes,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to get folder statistics');
  }
}

/**
 * Tool 12: Batch Move Files
 * Move multiple files to a target folder
 */
export interface BatchMoveFilesParams {
  fileIds: string[];  // Array of file IDs to move (required)
  targetFolderId: string;  // Target folder ID (required)
  removeFromAllParents?: boolean;  // Remove from all current parents (default: true)
}

export async function batchMoveFiles(params: BatchMoveFilesParams) {
  const drive = getDriveClient();
  const { fileIds, targetFolderId, removeFromAllParents = true } = params;

  logger.debug(`[BatchMove] Moving ${fileIds.length} files to folder: ${targetFolderId}`);

  if (!fileIds || fileIds.length === 0) {
    throw createInvalidParamsError('No file IDs provided');
  }

  // Validate targetFolderId
  validateFileId(targetFolderId, 'targetFolderId');

  // Validate all file IDs
  for (const fileId of fileIds) {
    validateFileId(fileId, 'fileIds[]');
  }

  try {
    // Verify target folder exists
    const targetFolder = await drive.files.get({
      fileId: targetFolderId,
      fields: 'id, name, mimeType',
    });

    if (targetFolder.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw validateFolderOrThrow(targetFolder.data.mimeType!, targetFolderId);
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const fileId of fileIds) {
      try {
        let removeParents: string | undefined = undefined;

        if (removeFromAllParents) {
          // Get current parents
          const fileInfo = await drive.files.get({
            fileId: fileId,
            fields: 'parents',
          });
          removeParents = fileInfo.data.parents?.join(',');
        }

        // Move file
        await drive.files.update({
          fileId: fileId,
          addParents: targetFolderId,
          removeParents: removeParents,
          fields: 'id, name',
        });

        results.push({ fileId, success: true });
        successCount++;
      } catch (error: any) {
        results.push({ fileId, success: false, error: error.message });
        failCount++;
      }
    }

    logger.debug(`[BatchMove] Completed: ${successCount} success, ${failCount} failed`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            summary: {
              total: fileIds.length,
              success: successCount,
              failed: failCount,
            },
            targetFolder: {
              id: targetFolder.data.id,
              name: targetFolder.data.name,
            },
            results: results,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to batch move files');
  }
}

/**
 * Tool 13: Batch Copy Files
 * Copy multiple files to a target folder
 */
export interface BatchCopyFilesParams {
  fileIds: string[];  // Array of file IDs to copy (required)
  targetFolderId: string;  // Target folder ID (required)
  namePrefix?: string;  // Optional prefix for copied files
}

export async function batchCopyFiles(params: BatchCopyFilesParams) {
  const drive = getDriveClient();
  const { fileIds, targetFolderId, namePrefix } = params;

  logger.debug(`[BatchCopy] Copying ${fileIds.length} files to folder: ${targetFolderId}`);

  if (!fileIds || fileIds.length === 0) {
    throw createInvalidParamsError('No file IDs provided');
  }

  // Validate targetFolderId
  validateFileId(targetFolderId, 'targetFolderId');

  // Validate all file IDs
  for (const fileId of fileIds) {
    validateFileId(fileId, 'fileIds[]');
  }

  try {
    // Verify target folder exists
    const targetFolder = await drive.files.get({
      fileId: targetFolderId,
      fields: 'id, name, mimeType',
    });

    if (targetFolder.data.mimeType !== 'application/vnd.google-apps.folder') {
      throw validateFolderOrThrow(targetFolder.data.mimeType!, targetFolderId);
    }

    const results = [];
    let successCount = 0;
    let failCount = 0;

    for (const fileId of fileIds) {
      try {
        // Get original file info
        const originalFile = await drive.files.get({
          fileId: fileId,
          fields: 'id, name, mimeType',
        });

        const newName = namePrefix ? `${namePrefix}${originalFile.data.name}` : originalFile.data.name;

        // Copy file (supports Google Workspace files)
        const copiedFile = await drive.files.copy({
          fileId: fileId,
          requestBody: {
            name: newName,
            parents: [targetFolderId],
          },
          fields: 'id, name',
        });

        results.push({
          fileId,
          success: true,
          newFileId: copiedFile.data.id,
          newFileName: copiedFile.data.name
        });
        successCount++;
      } catch (error: any) {
        results.push({ fileId, success: false, error: error.message });
        failCount++;
      }
    }

    logger.debug(`[BatchCopy] Completed: ${successCount} success, ${failCount} failed`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            summary: {
              total: fileIds.length,
              success: successCount,
              failed: failCount,
            },
            targetFolder: {
              id: targetFolder.data.id,
              name: targetFolder.data.name,
            },
            results: results,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to batch copy files');
  }
}

/**
 * Tool 14: Batch Delete Files
 * Delete multiple files (move to trash or permanently delete)
 */
export interface BatchDeleteFilesParams {
  fileIds: string[];  // Array of file IDs to delete (required)
  permanent?: boolean;  // Permanently delete (default: false, moves to trash)
}

export async function batchDeleteFiles(params: BatchDeleteFilesParams) {
  const drive = getDriveClient();
  const { fileIds, permanent = false } = params;

  logger.debug(`[BatchDelete] ${permanent ? 'Permanently deleting' : 'Trashing'} ${fileIds.length} files`);

  if (!fileIds || fileIds.length === 0) {
    throw createInvalidParamsError('No file IDs provided');
  }

  // Validate all file IDs before processing
  for (const fileId of fileIds) {
    validateFileId(fileId, 'fileIds[]');
  }

  const results = [];
  let successCount = 0;
  let failCount = 0;

  for (const fileId of fileIds) {
    try {
      if (permanent) {
        // Permanently delete
        await drive.files.delete({
          fileId: fileId,
        });
      } else {
        // Move to trash
        await drive.files.update({
          fileId: fileId,
          requestBody: {
            trashed: true,
          },
        });
      }

      results.push({ fileId, success: true });
      successCount++;
    } catch (error: any) {
      results.push({ fileId, success: false, error: error.message });
      failCount++;
    }
  }

  logger.debug(`[BatchDelete] Completed: ${successCount} success, ${failCount} failed`);

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({
          summary: {
            total: fileIds.length,
            success: successCount,
            failed: failCount,
            permanent: permanent,
          },
          results: results,
          warning: permanent ? 'Permanently deleted files cannot be recovered' : 'Files can be restored from trash',
        }, null, 2),
      },
    ],
  };
}
