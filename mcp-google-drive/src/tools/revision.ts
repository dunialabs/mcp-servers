/**
 * File revision (version history) tools for Google Drive
 */

import { getDriveClient, validateFileId } from './common.js';
import { createMcpError, GoogleDriveErrorCode } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List all revisions (versions) of a file
 */
export async function listRevisions(params: {
  fileId: string;
  limit?: number;
  pageToken?: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { fileId, limit = 20, pageToken } = params;

    // Validate fileId
    validateFileId(fileId);

    logger.debug(`[Revisions] Listing revisions for file: ${fileId}`);

    const drive = getDriveClient();

    // Get file revisions
    const response = await drive.revisions.list({
      fileId,
      pageSize: Math.min(limit, 1000),
      pageToken,
      fields: 'nextPageToken, revisions(id, modifiedTime, lastModifyingUser, size, mimeType, keepForever, published, publishedOutsideDomain, exportLinks)',
    });

    const revisions = response.data.revisions || [];

    if (revisions.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `No revisions found for file ${fileId}.\n\nNote: Some file types may not support revision history.`,
          },
        ],
      };
    }

    // Format revisions for display
    const revisionList = revisions.map((rev, index) => {
      const revisionNumber = revisions.length - index; // Newest first
      const date = rev.modifiedTime ? new Date(rev.modifiedTime).toLocaleString() : 'Unknown';
      const user = rev.lastModifyingUser?.displayName || rev.lastModifyingUser?.emailAddress || 'Unknown';
      const size = rev.size ? `${(parseInt(rev.size) / 1024).toFixed(2)} KB` : 'N/A';
      const keepForever = rev.keepForever ? ' [Kept Forever]' : '';
      const published = rev.published ? ' [Published]' : '';

      return `Revision ${revisionNumber}:
  ID: ${rev.id}
  Modified: ${date}
  Modified by: ${user}
  Size: ${size}
  MIME type: ${rev.mimeType || 'N/A'}${keepForever}${published}`;
    }).join('\n\n');

    let result = `📜 Revision History for File ${fileId}\n`;
    result += `═══════════════════════════════════════════\n\n`;
    result += `Total revisions: ${revisions.length}\n\n`;
    result += revisionList;

    if (response.data.nextPageToken) {
      result += `\n\n📄 More revisions available. Use pageToken: ${response.data.nextPageToken}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    logger.error('[Revisions] Error listing revisions:', error);

    if (error.code === 404) {
      throw createMcpError(
        GoogleDriveErrorCode.FileNotFound,
        `File not found: ${params.fileId}`
      );
    }

    if (error.code === 403) {
      throw createMcpError(
        GoogleDriveErrorCode.PermissionDenied,
        `Permission denied: You don't have access to this file's revision history`
      );
    }

    throw createMcpError(
      GoogleDriveErrorCode.NetworkError,
      `Failed to list revisions: ${error.message}`
    );
  }
}

/**
 * Get a specific revision of a file
 */
export async function getRevision(params: {
  fileId: string;
  revisionId: string;
  download?: boolean;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { fileId, revisionId, download = false } = params;

    // Validate fileId
    validateFileId(fileId);

    if (!revisionId || revisionId.trim() === '') {
      throw createMcpError(
        GoogleDriveErrorCode.InvalidParams,
        'revisionId is required'
      );
    }

    logger.debug(`[Revisions] Getting revision ${revisionId} for file: ${fileId}`);

    const drive = getDriveClient();

    // Get revision metadata
    const response = await drive.revisions.get({
      fileId,
      revisionId,
      fields: 'id, modifiedTime, lastModifyingUser, size, mimeType, keepForever, published, publishedOutsideDomain, exportLinks',
    });

    const revision = response.data;
    const date = revision.modifiedTime ? new Date(revision.modifiedTime).toLocaleString() : 'Unknown';
    const user = revision.lastModifyingUser?.displayName || revision.lastModifyingUser?.emailAddress || 'Unknown';
    const size = revision.size ? `${(parseInt(revision.size) / 1024).toFixed(2)} KB` : 'N/A';

    let result = `📄 Revision Details\n`;
    result += `═══════════════════════════════════════════\n\n`;
    result += `Revision ID: ${revision.id}\n`;
    result += `Modified: ${date}\n`;
    result += `Modified by: ${user}\n`;
    result += `Size: ${size}\n`;
    result += `MIME type: ${revision.mimeType || 'N/A'}\n`;
    result += `Keep forever: ${revision.keepForever ? 'Yes' : 'No'}\n`;
    result += `Published: ${revision.published ? 'Yes' : 'No'}\n`;

    if (revision.exportLinks) {
      result += `\nExport formats available:\n`;
      Object.entries(revision.exportLinks).forEach(([format]) => {
        result += `  - ${format}\n`;
      });
    }

    // If download is requested, fetch the content
    if (download) {
      try {
        const contentResponse = await drive.revisions.get(
          {
            fileId,
            revisionId,
            alt: 'media',
          },
          { responseType: 'text' }
        );

        result += `\n\n📝 Revision Content:\n`;
        result += `═══════════════════════════════════════════\n\n`;
        result += contentResponse.data as string;
      } catch (downloadError: any) {
        result += `\n\n⚠️ Could not download revision content: ${downloadError.message}`;
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    logger.error('[Revisions] Error getting revision:', error);

    if (error.code === 404) {
      throw createMcpError(
        GoogleDriveErrorCode.FileNotFound,
        `File or revision not found: ${params.fileId}/${params.revisionId}`
      );
    }

    if (error.code === 403) {
      throw createMcpError(
        GoogleDriveErrorCode.PermissionDenied,
        `Permission denied: You don't have access to this revision`
      );
    }

    throw createMcpError(
      GoogleDriveErrorCode.NetworkError,
      `Failed to get revision: ${error.message}`
    );
  }
}

/**
 * Update a revision (e.g., mark as keep forever)
 */
export async function updateRevision(params: {
  fileId: string;
  revisionId: string;
  keepForever?: boolean;
  published?: boolean;
  publishAuto?: boolean;
  publishedOutsideDomain?: boolean;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { fileId, revisionId, keepForever, published, publishAuto, publishedOutsideDomain } = params;

    // Validate fileId
    validateFileId(fileId);

    if (!revisionId || revisionId.trim() === '') {
      throw createMcpError(
        GoogleDriveErrorCode.InvalidParams,
        'revisionId is required'
      );
    }

    logger.debug(`[Revisions] Updating revision ${revisionId} for file: ${fileId}`);

    const drive = getDriveClient();

    const requestBody: any = {};
    if (keepForever !== undefined) requestBody.keepForever = keepForever;
    if (published !== undefined) requestBody.published = published;
    if (publishAuto !== undefined) requestBody.publishAuto = publishAuto;
    if (publishedOutsideDomain !== undefined) requestBody.publishedOutsideDomain = publishedOutsideDomain;

    // Update revision
    const response = await drive.revisions.update({
      fileId,
      revisionId,
      requestBody,
      fields: 'id, modifiedTime, keepForever, published, publishedOutsideDomain',
    });

    const revision = response.data;

    let result = `✅ Revision Updated Successfully\n\n`;
    result += `Revision ID: ${revision.id}\n`;
    result += `Keep forever: ${revision.keepForever ? 'Yes' : 'No'}\n`;
    result += `Published: ${revision.published ? 'Yes' : 'No'}\n`;

    if (revision.publishedOutsideDomain !== undefined) {
      result += `Published outside domain: ${revision.publishedOutsideDomain ? 'Yes' : 'No'}\n`;
    }

    return {
      content: [
        {
          type: 'text',
          text: result,
        },
      ],
    };
  } catch (error: any) {
    logger.error('[Revisions] Error updating revision:', error);

    if (error.code === 404) {
      throw createMcpError(
        GoogleDriveErrorCode.FileNotFound,
        `File or revision not found: ${params.fileId}/${params.revisionId}`
      );
    }

    if (error.code === 403) {
      throw createMcpError(
        GoogleDriveErrorCode.PermissionDenied,
        `Permission denied: You don't have permission to update this revision`
      );
    }

    throw createMcpError(
      GoogleDriveErrorCode.NetworkError,
      `Failed to update revision: ${error.message}`
    );
  }
}

/**
 * Delete a revision (only if not kept forever)
 */
export async function deleteRevision(params: {
  fileId: string;
  revisionId: string;
}): Promise<{ content: { type: 'text'; text: string }[] }> {
  try {
    const { fileId, revisionId } = params;

    // Validate fileId
    validateFileId(fileId);

    if (!revisionId || revisionId.trim() === '') {
      throw createMcpError(
        GoogleDriveErrorCode.InvalidParams,
        'revisionId is required'
      );
    }

    logger.debug(`[Revisions] Deleting revision ${revisionId} for file: ${fileId}`);

    const drive = getDriveClient();

    // Delete revision
    await drive.revisions.delete({
      fileId,
      revisionId,
    });

    return {
      content: [
        {
          type: 'text',
          text: `✅ Revision ${revisionId} deleted successfully\n\nNote: Revisions marked as "keep forever" cannot be deleted.`,
        },
      ],
    };
  } catch (error: any) {
    logger.error('[Revisions] Error deleting revision:', error);

    if (error.code === 404) {
      throw createMcpError(
        GoogleDriveErrorCode.FileNotFound,
        `File or revision not found: ${params.fileId}/${params.revisionId}`
      );
    }

    if (error.code === 403) {
      throw createMcpError(
        GoogleDriveErrorCode.PermissionDenied,
        `Permission denied: Cannot delete this revision (it may be marked as "keep forever")`
      );
    }

    throw createMcpError(
      GoogleDriveErrorCode.NetworkError,
      `Failed to delete revision: ${error.message}`
    );
  }
}
