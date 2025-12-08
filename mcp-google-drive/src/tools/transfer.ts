/**
 * Google Drive File Transfer Operations
 * Tools for uploading and exporting files
 */

import { getDriveClient, isGoogleWorkspaceFile, formatBytes, validateFileId, validateMimeType } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError } from '../utils/errors.js';

/**
 * Tool 19: Upload File
 * Upload a local file to Google Drive (supports base64 encoded content)
 */
export interface UploadFileParams {
  name: string;  // File name (required)
  content: string;  // File content in base64 or plain text (required)
  mimeType?: string;  // MIME type (optional, auto-detected if not provided)
  parentId?: string;  // Parent folder ID (optional, defaults to root)
  description?: string;  // File description (optional)
  starred?: boolean;  // Star the file (optional, default: false)
  isBase64?: boolean;  // Whether content is base64 encoded (default: true)
}

export async function uploadFile(params: UploadFileParams) {
  const drive = getDriveClient();
  const { name, content, mimeType, parentId, description, starred = false, isBase64 = true } = params;

  // Validate parentId if provided
  if (parentId) {
    validateFileId(parentId, 'parentId');
  }

  logger.debug(`[UploadFile] Uploading file: ${name}`);

  try {
    // Prepare file metadata
    const fileMetadata: any = {
      name: name,
      description: description,
      starred: starred,
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    // Decode content if base64
    let fileContent: Buffer;
    if (isBase64) {
      try {
        fileContent = Buffer.from(content, 'base64');
      } catch (error) {
        throw createInvalidParamsError('Invalid base64 content. Set isBase64=false for plain text content.');
      }
    } else {
      fileContent = Buffer.from(content, 'utf-8');
    }

    // Auto-detect MIME type if not provided
    let finalMimeType = mimeType;
    if (!finalMimeType) {
      // Simple MIME type detection based on file extension
      const ext = name.split('.').pop()?.toLowerCase();
      const mimeTypeMap: Record<string, string> = {
        'txt': 'text/plain',
        'md': 'text/markdown',
        'markdown': 'text/markdown',
        'pdf': 'application/pdf',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'zip': 'application/zip',
        'json': 'application/json',
        'xml': 'application/xml',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'py': 'text/x-python',
        'java': 'text/x-java',
        'sh': 'text/x-sh',
      };
      finalMimeType = mimeTypeMap[ext || ''] || 'application/octet-stream';
    } else {
      // Validate user-provided MIME type
      validateMimeType(finalMimeType);
    }

    // Convert Buffer to Readable stream
    const { Readable } = await import('stream');
    const fileStream = Readable.from([fileContent]);

    // Upload file using multipart upload
    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: {
        mimeType: finalMimeType,
        body: fileStream,
      },
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents',
    });

    const file = response.data;

    logger.debug(`[UploadFile] File uploaded successfully: ${file.id}`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File uploaded successfully',
            file: {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size,
              createdTime: file.createdTime,
              modifiedTime: file.modifiedTime,
              webViewLink: file.webViewLink,
              webContentLink: file.webContentLink,
              parents: file.parents,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to upload file');
  }
}

/**
 * Tool 20: Export File
 * Export Google Workspace files to various formats (Docs to PDF/Word, Sheets to Excel/CSV, etc.)
 */
export interface ExportFileParams {
  fileId: string;  // File ID to export (required)
  format?: string;  // Export format (optional, auto-selected if not provided)
  // Supported formats:
  // - For Docs: 'pdf', 'docx', 'rtf', 'txt', 'html', 'epub', 'odt'
  // - For Sheets: 'xlsx', 'ods', 'csv', 'pdf', 'html', 'tsv'
  // - For Slides: 'pdf', 'pptx', 'odp', 'txt'
  // - For Drawings: 'pdf', 'png', 'jpg', 'svg'
}

export async function exportFile(params: ExportFileParams) {
  const drive = getDriveClient();
  const { fileId, format } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[ExportFile] Exporting file: ${fileId}`);

  try {
    // Get file metadata first
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType',
    });

    const file = fileInfo.data;
    const mimeType = file.mimeType!;

    // Check if it's a Google Workspace file
    if (!isGoogleWorkspaceFile(mimeType)) {
      throw createInvalidParamsError(`File is not a Google Workspace file. Use gdrive_search_and_retrieve or resource URI to download regular files.`);
    }

    // Determine export MIME type
    let exportMimeType: string;
    let fileExtension: string;

    if (format) {
      // User specified format
      const formatMap: Record<string, { mimeType: string; extension: string }> = {
        // Documents
        'pdf': { mimeType: 'application/pdf', extension: 'pdf' },
        'docx': { mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', extension: 'docx' },
        'rtf': { mimeType: 'application/rtf', extension: 'rtf' },
        'txt': { mimeType: 'text/plain', extension: 'txt' },
        'html': { mimeType: 'text/html', extension: 'html' },
        'epub': { mimeType: 'application/epub+zip', extension: 'epub' },
        'odt': { mimeType: 'application/vnd.oasis.opendocument.text', extension: 'odt' },
        // Spreadsheets
        'xlsx': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' },
        'ods': { mimeType: 'application/vnd.oasis.opendocument.spreadsheet', extension: 'ods' },
        'csv': { mimeType: 'text/csv', extension: 'csv' },
        'tsv': { mimeType: 'text/tab-separated-values', extension: 'tsv' },
        // Presentations
        'pptx': { mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', extension: 'pptx' },
        'odp': { mimeType: 'application/vnd.oasis.opendocument.presentation', extension: 'odp' },
        // Images
        'png': { mimeType: 'image/png', extension: 'png' },
        'jpg': { mimeType: 'image/jpeg', extension: 'jpg' },
        'jpeg': { mimeType: 'image/jpeg', extension: 'jpeg' },
        'svg': { mimeType: 'image/svg+xml', extension: 'svg' },
      };

      const formatInfo = formatMap[format.toLowerCase()];
      if (!formatInfo) {
        throw createInvalidParamsError(`Unsupported export format: ${format}`);
      }

      exportMimeType = formatInfo.mimeType;
      fileExtension = formatInfo.extension;

      // Validate format is compatible with file type
      const validFormats: Record<string, string[]> = {
        'application/vnd.google-apps.document': ['pdf', 'docx', 'rtf', 'txt', 'html', 'epub', 'odt'],
        'application/vnd.google-apps.spreadsheet': ['xlsx', 'ods', 'csv', 'pdf', 'html', 'tsv'],
        'application/vnd.google-apps.presentation': ['pdf', 'pptx', 'odp', 'txt'],
        'application/vnd.google-apps.drawing': ['pdf', 'png', 'jpg', 'jpeg', 'svg'],
      };

      const allowedFormats = validFormats[mimeType] || [];
      if (!allowedFormats.includes(format.toLowerCase())) {
        throw createInvalidParamsError(`Format '${format}' is not supported for ${mimeType}. Supported formats: ${allowedFormats.join(', ')}`);
      }
    } else {
      // Auto-select format based on file type (default to PDF for most types)
      const defaultFormats: Record<string, { mimeType: string; extension: string }> = {
        'application/vnd.google-apps.document': { mimeType: 'application/pdf', extension: 'pdf' },
        'application/vnd.google-apps.spreadsheet': { mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', extension: 'xlsx' },
        'application/vnd.google-apps.presentation': { mimeType: 'application/pdf', extension: 'pdf' },
        'application/vnd.google-apps.drawing': { mimeType: 'application/pdf', extension: 'pdf' },
      };

      const defaultFormat = defaultFormats[mimeType];
      if (!defaultFormat) {
        throw createInvalidParamsError(`Cannot auto-detect export format for ${mimeType}. Please specify format parameter.`);
      }

      exportMimeType = defaultFormat.mimeType;
      fileExtension = defaultFormat.extension;
    }

    // Export the file
    const response = await drive.files.export(
      {
        fileId: fileId,
        mimeType: exportMimeType,
      },
      {
        responseType: 'arraybuffer',
      }
    );

    // Convert to base64
    const buffer = Buffer.from(response.data as ArrayBuffer);
    const base64Content = buffer.toString('base64');
    const sizeInBytes = buffer.length;

    logger.debug(`[ExportFile] File exported successfully: ${file.id} (${sizeInBytes} bytes)`);

    // Generate filename
    const exportedFileName = `${file.name}.${fileExtension}`;

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File exported successfully',
            file: {
              id: file.id,
              originalName: file.name,
              exportedName: exportedFileName,
              originalMimeType: mimeType,
              exportMimeType: exportMimeType,
              size: sizeInBytes,
              sizeFormatted: formatBytes(sizeInBytes),
            },
            content: base64Content,
            encoding: 'base64',
            note: 'Content is base64 encoded. Decode before saving to disk.',
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to export file');
  }
}
