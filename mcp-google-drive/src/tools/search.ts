/**
 * Google Drive Search Tools
 * Implements:
 * 1. gdrive_search - Advanced search with filters
 * 2. gdrive_search_and_retrieve - Search + retrieve file contents in one step
 * 3. gdrive_get_file_metadata - Get complete metadata for a file
 */

import { getDriveClient, getExportMimeType, isGoogleWorkspaceFile, formatBytes, buildQuery, validateFileId } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError } from '../utils/errors.js';

/**
 * Format file size in human-readable format (legacy function for compatibility)
 */
function formatFileSize(bytes: number): string {
  return formatBytes(bytes);
}

/**
 * Tool 1: Advanced Search
 */
export interface SearchParams {
  query?: string;
  fileTypes?: string[];
  modifiedAfter?: string;
  owner?: string;
  inFolder?: string;
  sharedWithMe?: boolean;
  starred?: boolean;
  trashed?: boolean;
  limit?: number;
}

export async function searchFiles(params: SearchParams) {
  const drive = getDriveClient();

  const query = buildQuery(params);
  const limit = params.limit || 20;

  logger.debug(`[Search] Query: ${query}, Limit: ${limit}`);

  try {
    const response = await drive.files.list({
      q: query,
      pageSize: limit,
      fields: 'files(id, name, mimeType, size, modifiedTime, owners, webViewLink, iconLink, starred, shared)',
      orderBy: 'modifiedTime desc',
    });

    const files = response.data.files || [];

    logger.debug(`[Search] Found ${files.length} files`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            query: params.query || 'all files',
            totalResults: files.length,
            files: files.map(file => ({
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatFileSize(parseInt(file.size)) : 'N/A',
              modifiedTime: file.modifiedTime,
              owners: file.owners?.map(o => o.displayName || o.emailAddress).join(', '),
              webViewLink: file.webViewLink,
              iconLink: file.iconLink,
              starred: file.starred,
              shared: file.shared,
              resourceUri: `gdrive:///${file.id}`,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to search files');
  }
}

/**
 * Tool 2: Search and Retrieve
 * Searches for files and retrieves content of the first match
 */
export interface SearchAndRetrieveParams {
  query: string;
  fileTypes?: string[];
  modifiedAfter?: string;
  owner?: string;
  inFolder?: string;
  sharedWithMe?: boolean;
  maxSize?: number; // Max file size to retrieve (in MB, default 10)
}

export async function searchAndRetrieve(params: SearchAndRetrieveParams) {
  const drive = getDriveClient();

  // Validate inFolder if provided
  if (params.inFolder) {
    validateFileId(params.inFolder, 'inFolder');
  }

  // First, search for files
  const searchQuery = buildQuery(params);

  logger.debug(`[SearchAndRetrieve] Query: ${searchQuery}`);

  try {
    const searchResponse = await drive.files.list({
      q: searchQuery,
      pageSize: 5,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
      orderBy: 'modifiedTime desc',
    });

    const files = searchResponse.data.files || [];

    if (files.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              query: params.query,
              error: 'No files found matching the query',
            }, null, 2),
          },
        ],
      };
    }

    // Get the first file
    const file = files[0];
    logger.debug(`[SearchAndRetrieve] Found file: ${file.name} (${file.id})`);

    // Check file size
    const maxSizeBytes = (params.maxSize || 10) * 1024 * 1024;
    const fileSize = file.size ? parseInt(file.size) : 0;

    if (fileSize > maxSizeBytes) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              file: {
                id: file.id,
                name: file.name,
                mimeType: file.mimeType,
                size: formatFileSize(fileSize),
                modifiedTime: file.modifiedTime,
                webViewLink: file.webViewLink,
              },
              error: `File too large (${formatFileSize(fileSize)}). Maximum size: ${params.maxSize || 10} MB`,
              suggestion: `Use Resource URI to read file: gdrive:///${file.id}`,
            }, null, 2),
          },
        ],
      };
    }

    // Retrieve file content
    let content: string;

    if (isGoogleWorkspaceFile(file.mimeType!)) {
      // Export Google Workspace files
      const exportMimeType = getExportMimeType(file.mimeType!);

      if (!exportMimeType) {
        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify({
                file: {
                  id: file.id,
                  name: file.name,
                  mimeType: file.mimeType,
                  webViewLink: file.webViewLink,
                },
                error: `Cannot export file type: ${file.mimeType}`,
              }, null, 2),
            },
          ],
        };
      }

      logger.debug(`[SearchAndRetrieve] Exporting as ${exportMimeType}`);

      const exportResponse = await drive.files.export(
        { fileId: file.id!, mimeType: exportMimeType },
        { responseType: 'text' }
      );

      content = exportResponse.data as string;
    } else {
      // Download binary files
      logger.debug('[SearchAndRetrieve] Downloading binary file');

      const downloadResponse = await drive.files.get(
        { fileId: file.id!, alt: 'media' },
        { responseType: 'text' }
      );

      content = downloadResponse.data as string;
    }

    logger.debug(`[SearchAndRetrieve] Retrieved ${content.length} characters`);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            file: {
              id: file.id,
              name: file.name,
              mimeType: file.mimeType,
              size: file.size ? formatFileSize(parseInt(file.size)) : 'N/A',
              modifiedTime: file.modifiedTime,
              webViewLink: file.webViewLink,
              resourceUri: `gdrive:///${file.id}`,
            },
            content: content,
            otherMatches: files.slice(1).map(f => ({
              id: f.id,
              name: f.name,
              mimeType: f.mimeType,
              resourceUri: `gdrive:///${f.id}`,
            })),
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to search and retrieve file');
  }
}

/**
 * Tool 3: Get File Metadata
 * Get complete metadata for a specific file
 */
export interface GetFileMetadataParams {
  fileId: string;
  includePermissions?: boolean;  // Include permission details (default: true)
  includeProperties?: boolean;   // Include custom properties (default: false)
}

export async function getFileMetadata(params: GetFileMetadataParams) {
  const drive = getDriveClient();
  const { fileId, includePermissions = true, includeProperties = false } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[FileMetadata] Getting metadata for file: ${fileId}`);

  try {
    // Build fields parameter based on options
    const fields = [
      'id',
      'name',
      'mimeType',
      'description',
      'starred',
      'trashed',
      'explicitlyTrashed',
      'parents',
      'properties',
      'appProperties',
      'spaces',
      'version',
      'webContentLink',
      'webViewLink',
      'iconLink',
      'hasThumbnail',
      'thumbnailLink',
      'thumbnailVersion',
      'viewedByMe',
      'viewedByMeTime',
      'createdTime',
      'modifiedTime',
      'modifiedByMeTime',
      'modifiedByMe',
      'sharedWithMeTime',
      'sharingUser',
      'owners',
      'lastModifyingUser',
      'shared',
      'ownedByMe',
      'capabilities',
      'viewersCanCopyContent',
      'copyRequiresWriterPermission',
      'writersCanShare',
      'size',
      'quotaBytesUsed',
      'headRevisionId',
      'contentHints',
      'imageMediaMetadata',
      'videoMediaMetadata',
      'isAppAuthorized',
      'exportLinks',
      'shortcutDetails',
      'contentRestrictions',
      'resourceKey',
      'linkShareMetadata',
      'labelInfo',
      'sha1Checksum',
      'sha256Checksum',
      'md5Checksum',
    ];

    if (includePermissions) {
      fields.push('permissions');
    }

    const response = await drive.files.get({
      fileId: fileId,
      fields: fields.join(','),
      supportsAllDrives: true,
    });

    const file = response.data;

    logger.debug(`[FileMetadata] Retrieved metadata for: ${file.name}`);

    // Format the response
    const metadata: any = {
      // Basic Info
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      description: file.description || null,

      // Status
      starred: file.starred,
      trashed: file.trashed,
      explicitlyTrashed: file.explicitlyTrashed,

      // Hierarchy
      parents: file.parents || [],
      isRoot: !file.parents || file.parents.length === 0,

      // Type Info
      isFolder: file.mimeType === 'application/vnd.google-apps.folder',
      isGoogleWorkspace: isGoogleWorkspaceFile(file.mimeType!),

      // Size & Storage
      size: file.size ? formatFileSize(parseInt(file.size)) : 'N/A',
      sizeBytes: file.size ? parseInt(file.size) : null,
      quotaBytesUsed: file.quotaBytesUsed,

      // Timestamps
      createdTime: file.createdTime,
      modifiedTime: file.modifiedTime,
      modifiedByMeTime: file.modifiedByMeTime,
      viewedByMeTime: file.viewedByMeTime,
      sharedWithMeTime: file.sharedWithMeTime,

      // People
      owners: file.owners?.map(owner => ({
        displayName: owner.displayName,
        emailAddress: owner.emailAddress,
        photoLink: owner.photoLink,
        me: owner.me,
      })),
      lastModifyingUser: file.lastModifyingUser ? {
        displayName: file.lastModifyingUser.displayName,
        emailAddress: file.lastModifyingUser.emailAddress,
        photoLink: file.lastModifyingUser.photoLink,
        me: file.lastModifyingUser.me,
      } : null,
      sharingUser: file.sharingUser ? {
        displayName: file.sharingUser.displayName,
        emailAddress: file.sharingUser.emailAddress,
        photoLink: file.sharingUser.photoLink,
        me: file.sharingUser.me,
      } : null,

      // Sharing
      shared: file.shared,
      ownedByMe: file.ownedByMe,
      viewedByMe: file.viewedByMe,
      modifiedByMe: file.modifiedByMe,

      // Capabilities
      capabilities: file.capabilities ? {
        canEdit: file.capabilities.canEdit,
        canComment: file.capabilities.canComment,
        canShare: file.capabilities.canShare,
        canCopy: file.capabilities.canCopy,
        canDownload: file.capabilities.canDownload,
        canDelete: file.capabilities.canDelete,
        canRename: file.capabilities.canRename,
        canAddChildren: file.capabilities.canAddChildren,
        canMoveItemIntoTeamDrive: file.capabilities.canMoveItemIntoTeamDrive,
        canMoveItemOutOfDrive: file.capabilities.canMoveItemOutOfDrive,
        canReadRevisions: file.capabilities.canReadRevisions,
      } : null,

      // Links
      webViewLink: file.webViewLink,
      webContentLink: file.webContentLink,
      iconLink: file.iconLink,
      thumbnailLink: file.thumbnailLink,
      exportLinks: file.exportLinks || null,

      // Thumbnail
      hasThumbnail: file.hasThumbnail,
      thumbnailVersion: file.thumbnailVersion,

      // Version & Checksum
      version: file.version,
      headRevisionId: file.headRevisionId,
      md5Checksum: file.md5Checksum,
      sha1Checksum: file.sha1Checksum,
      sha256Checksum: file.sha256Checksum,

      // Media Metadata
      imageMediaMetadata: file.imageMediaMetadata ? {
        width: file.imageMediaMetadata.width,
        height: file.imageMediaMetadata.height,
        rotation: file.imageMediaMetadata.rotation,
        time: file.imageMediaMetadata.time,
        cameraMake: file.imageMediaMetadata.cameraMake,
        cameraModel: file.imageMediaMetadata.cameraModel,
        exposureTime: file.imageMediaMetadata.exposureTime,
        aperture: file.imageMediaMetadata.aperture,
        flashUsed: file.imageMediaMetadata.flashUsed,
        focalLength: file.imageMediaMetadata.focalLength,
        isoSpeed: file.imageMediaMetadata.isoSpeed,
        meteringMode: file.imageMediaMetadata.meteringMode,
        sensor: file.imageMediaMetadata.sensor,
        exposureMode: file.imageMediaMetadata.exposureMode,
        colorSpace: file.imageMediaMetadata.colorSpace,
        whiteBalance: file.imageMediaMetadata.whiteBalance,
        exposureBias: file.imageMediaMetadata.exposureBias,
        maxApertureValue: file.imageMediaMetadata.maxApertureValue,
        subjectDistance: file.imageMediaMetadata.subjectDistance,
        lens: file.imageMediaMetadata.lens,
      } : null,
      videoMediaMetadata: file.videoMediaMetadata ? {
        width: file.videoMediaMetadata.width,
        height: file.videoMediaMetadata.height,
        durationMillis: file.videoMediaMetadata.durationMillis,
      } : null,

      // Shortcut Details (if this is a shortcut)
      shortcutDetails: file.shortcutDetails ? {
        targetId: file.shortcutDetails.targetId,
        targetMimeType: file.shortcutDetails.targetMimeType,
        targetResourceKey: file.shortcutDetails.targetResourceKey,
      } : null,

      // Advanced
      spaces: file.spaces,
      resourceKey: file.resourceKey,
      isAppAuthorized: file.isAppAuthorized,
      viewersCanCopyContent: file.viewersCanCopyContent,
      copyRequiresWriterPermission: file.copyRequiresWriterPermission,
      writersCanShare: file.writersCanShare,

      // MCP Resource URI
      resourceUri: `gdrive:///${file.id}`,
    };

    // Add permissions if requested
    if (includePermissions && file.permissions) {
      metadata.permissions = file.permissions.map(perm => ({
        id: perm.id,
        type: perm.type,  // user, group, domain, anyone
        role: perm.role,  // owner, organizer, fileOrganizer, writer, commenter, reader
        emailAddress: perm.emailAddress,
        displayName: perm.displayName,
        photoLink: perm.photoLink,
        domain: perm.domain,
        allowFileDiscovery: perm.allowFileDiscovery,
        deleted: perm.deleted,
        expirationTime: perm.expirationTime,
        pendingOwner: perm.pendingOwner,
      }));
      metadata.permissionCount = file.permissions.length;
    }

    // Add custom properties if requested
    if (includeProperties) {
      metadata.customProperties = file.properties || {};
      metadata.appProperties = file.appProperties || {};
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(metadata, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to get file metadata');
  }
}
