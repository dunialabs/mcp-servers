/**
 * Google Drive File Operations
 * Tools for creating, updating, and deleting files and folders
 */

import { getDriveClient, isGoogleWorkspaceFile, formatBytes, validateFileId, validateMimeType } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError } from '../utils/errors.js';

/**
 * Tool 5: Create File
 * Create a new file or folder in Google Drive
 */
export interface CreateFileParams {
  name: string;                  // File name (required)
  content?: string;               // File content (for text files)
  mimeType?: string;              // MIME type (optional, defaults based on content)
  parentId?: string;              // Parent folder ID (optional, defaults to root)
  description?: string;           // File description (optional)
  starred?: boolean;              // Star the file (optional, default: false)
  folderColorRgb?: string;        // Folder color if creating folder (optional)
}

export async function createFile(params: CreateFileParams) {
  const drive = getDriveClient();
  const { name, content, mimeType, parentId, description, starred, folderColorRgb } = params;

  // Validate parentId if provided
  if (parentId) {
    validateFileId(parentId, 'parentId');
  }

  // Validate mimeType if provided by user
  if (mimeType) {
    validateMimeType(mimeType);
  }

  logger.debug(`[CreateFile] Creating file: ${name}`);

  try {
    // Determine MIME type
    let finalMimeType = mimeType;
    const isFolder = mimeType === 'application/vnd.google-apps.folder';
    const isGoogleWorkspace = finalMimeType?.startsWith('application/vnd.google-apps.') && !isFolder;

    if (!finalMimeType && !content) {
      // Default to folder if no content provided
      finalMimeType = 'application/vnd.google-apps.folder';
    } else if (!finalMimeType && content) {
      // Default to plain text if content provided
      finalMimeType = 'text/plain';
    }

    // Google Workspace files with content need special handling
    let uploadMimeType = finalMimeType;
    if (isGoogleWorkspace && content) {
      // Upload as HTML and let Google convert to the target Workspace format
      uploadMimeType = 'text/html';
    }

    // Build file metadata
    const fileMetadata: any = {
      name: name,
      mimeType: finalMimeType,
    };

    if (description) {
      fileMetadata.description = description;
    }

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    if (starred) {
      fileMetadata.starred = true;
    }

    if (isFolder && folderColorRgb) {
      fileMetadata.folderColorRgb = folderColorRgb;
    }

    let response;

    if (isFolder || !content) {
      // Create empty file or folder
      response = await drive.files.create({
        requestBody: fileMetadata,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents',
      });
    } else {
      // Create file with content
      const { Readable } = await import('stream');
      const media = {
        mimeType: uploadMimeType!,
        body: Readable.from([content]),
      };

      response = await drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents',
      });
    }

    const file = response.data;

    logger.debug(`[CreateFile] Created file: ${file.name} (${file.id})`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: isFolder ? 'Folder created successfully' : 'File created successfully',
            file: {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatBytes(parseInt(file.size)) : 'N/A',
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime,
              webViewLink: file.webViewLink,
              parents: file.parents || [],
              resourceUri: `gdrive:///${file.id}`,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to create file');
  }
}

/**
 * Tool 6: Update File
 * Update an existing file's content or metadata
 */
export interface UpdateFileParams {
  fileId: string;                 // File ID (required)
  name?: string;                  // New file name (optional)
  content?: string;               // New file content (optional)
  description?: string;           // New description (optional)
  starred?: boolean;              // Star/unstar the file (optional)
  trashed?: boolean;              // Move to/from trash (optional)
  addParents?: string[];          // Add to folders (optional)
  removeParents?: string[];       // Remove from folders (optional)
}

export async function updateFile(params: UpdateFileParams) {
  const drive = getDriveClient();
  const { fileId, name, content, description, starred, trashed, addParents, removeParents } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  // Validate addParents if provided
  if (addParents && addParents.length > 0) {
    addParents.forEach(parentId => validateFileId(parentId, 'addParents[]'));
  }

  // Validate removeParents if provided
  if (removeParents && removeParents.length > 0) {
    removeParents.forEach(parentId => validateFileId(parentId, 'removeParents[]'));
  }

  logger.debug(`[UpdateFile] Updating file: ${fileId}`);

  try {
    // Build update metadata
    const fileMetadata: any = {};

    if (name !== undefined) {
      fileMetadata.name = name;
    }

    if (description !== undefined) {
      fileMetadata.description = description;
    }

    if (starred !== undefined) {
      fileMetadata.starred = starred;
    }

    if (trashed !== undefined) {
      fileMetadata.trashed = trashed;
    }

    // Build update options
    const updateOptions: any = {
      fileId: fileId,
      requestBody: fileMetadata,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink, parents, description, starred, trashed',
    };

    if (addParents && addParents.length > 0) {
      updateOptions.addParents = addParents.join(',');
    }

    if (removeParents && removeParents.length > 0) {
      updateOptions.removeParents = removeParents.join(',');
    }

    let response;

    if (content !== undefined) {
      // Update file content
      // First get current file to check MIME type
      const currentFile = await drive.files.get({
        fileId: fileId,
        fields: 'mimeType',
      });

      if (isGoogleWorkspaceFile(currentFile.data.mimeType!)) {
        throw createInvalidParamsError('Cannot update content of Google Workspace files directly. Use Google Docs API instead.');
      }

      const { Readable } = await import('stream');
      const media = {
        mimeType: currentFile.data.mimeType!,
        body: Readable.from([content]),
      };

      updateOptions.media = media;
    }

    response = await drive.files.update(updateOptions);

    const file = response.data;

    logger.debug(`[UpdateFile] Updated file: ${file.name} (${file.id})`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File updated successfully',
            file: {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatBytes(parseInt(file.size)) : 'N/A',
              modifiedTime: file.modifiedTime,
              webViewLink: file.webViewLink,
              parents: file.parents || [],
              description: file.description,
              starred: file.starred,
              trashed: file.trashed,
              resourceUri: `gdrive:///${file.id}`,
            },
            changes: {
              nameChanged: name !== undefined,
              contentChanged: content !== undefined,
              descriptionChanged: description !== undefined,
              starredChanged: starred !== undefined,
              trashedChanged: trashed !== undefined,
              parentsAdded: addParents?.length || 0,
              parentsRemoved: removeParents?.length || 0,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to update file');
  }
}

/**
 * Tool 7: Delete File
 * Permanently delete a file or move it to trash
 */
export interface DeleteFileParams {
  fileId: string;                 // File ID (required)
  permanent?: boolean;            // Permanently delete (default: false, moves to trash)
}

export async function deleteFile(params: DeleteFileParams) {
  const drive = getDriveClient();
  const { fileId, permanent = false } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[DeleteFile] ${permanent ? 'Permanently deleting' : 'Trashing'} file: ${fileId}`);

  try {
    // First get file info
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, parents',
    });

    const file = fileInfo.data;

    if (permanent) {
      // Permanently delete
      await drive.files.delete({
        fileId: fileId,
      });

      logger.debug(`[DeleteFile] Permanently deleted file: ${file.name} (${file.id})`);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: 'File permanently deleted',
              file: {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: file.size ? formatBytes(parseInt(file.size)) : 'N/A',
              },
              warning: 'This action cannot be undone',
            }, null, 2),
          },
        ],
      };
    } else {
      // Move to trash
      const response = await drive.files.update({
        fileId: fileId,
        requestBody: {
          trashed: true,
        },
        fields: 'id, name, mimeType, size, trashed, trashedTime',
      });

      const trashedFile = response.data;

      logger.debug(`[DeleteFile] Moved to trash: ${trashedFile.name} (${trashedFile.id})`);

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              success: true,
              message: 'File moved to trash',
              file: {
                id: trashedFile.id,
                name: trashedFile.name,
                mimeType: trashedFile.mimeType,
                size: trashedFile.size ? formatBytes(parseInt(trashedFile.size)) : 'N/A',
                trashed: trashedFile.trashed,
                trashedTime: trashedFile.trashedTime,
              },
              note: 'You can restore this file using gdrive_restore_trash',
            }, null, 2),
          },
        ],
      };
    }
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to delete file');
  }
}

/**
 * Tool 21: Copy File
 * Create a copy of a file in the same or different folder
 */
export interface CopyFileParams {
  fileId: string;                 // Source file ID (required)
  name?: string;                  // New file name (optional, defaults to "Copy of [original name]")
  parentId?: string;              // Target folder ID (optional, defaults to same folder as source)
  description?: string;           // Description for the copy (optional)
  starred?: boolean;              // Star the copied file (optional)
}

export async function copyFile(params: CopyFileParams) {
  const drive = getDriveClient();
  const { fileId, name, parentId, description, starred } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  // Validate parentId if provided
  if (parentId) {
    validateFileId(parentId, 'parentId');
  }

  logger.debug(`[CopyFile] Copying file: ${fileId}`);

  try {
    // Get source file info
    const sourceFile = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, size, parents',
    });

    // Check if it's a Google Workspace file (Docs, Sheets, Slides can be copied)
    const isWorkspaceFile = sourceFile.data.mimeType?.startsWith('application/vnd.google-apps.');

    // Build copy metadata
    const copyMetadata: any = {};

    if (name) {
      copyMetadata.name = name;
    } else {
      copyMetadata.name = `Copy of ${sourceFile.data.name}`;
    }

    if (description) {
      copyMetadata.description = description;
    }

    if (starred !== undefined) {
      copyMetadata.starred = starred;
    }

    if (parentId) {
      copyMetadata.parents = [parentId];
    }

    // Copy the file
    const response = await drive.files.copy({
      fileId: fileId,
      requestBody: copyMetadata,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, parents, description, starred',
    });

    const copiedFile = response.data;

    logger.debug(`[CopyFile] File copied successfully: ${copiedFile.name} (${copiedFile.id})`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File copied successfully',
            source: {
              id: sourceFile.data.id,
              name: sourceFile.data.name,
              mimeType: sourceFile.data.mimeType,
            },
            copy: {
              id: copiedFile.id,
              name: copiedFile.name,
              mimeType: copiedFile.mimeType,
              size: copiedFile.size ? formatBytes(parseInt(copiedFile.size)) : 'N/A',
              createdTime: copiedFile.createdTime,
              modifiedTime: copiedFile.modifiedTime,
              webViewLink: copiedFile.webViewLink,
              parents: copiedFile.parents || [],
              description: copiedFile.description,
              starred: copiedFile.starred,
              resourceUri: `gdrive:///${copiedFile.id}`,
            },
            note: isWorkspaceFile
              ? 'Google Workspace file copied successfully (Docs, Sheets, Slides)'
              : 'File copied successfully',
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to copy file');
  }
}
