/**
 * Google Drive Permission Management
 * Tools for sharing files and managing permissions
 */

import { getDriveClient, validateFileId } from './common.js';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, createInvalidParamsError } from '../utils/errors.js';

/**
 * Tool 15: Share File/Folder
 * Add permission to share a file or folder with users, groups, or make it public
 */
export interface ShareFileParams {
  fileId: string;  // File or folder ID (required)
  role: 'reader' | 'writer' | 'commenter' | 'owner';  // Permission role (required)
  type: 'user' | 'group' | 'domain' | 'anyone';  // Permission type (required)
  emailAddress?: string;  // Email address (required for user/group type)
  domain?: string;  // Domain name (required for domain type)
  sendNotificationEmail?: boolean;  // Send notification email (default: true)
  emailMessage?: string;  // Custom message in notification email
  allowFileDiscovery?: boolean;  // Allow file discovery for 'anyone' type (default: false)
}

export async function shareFile(params: ShareFileParams) {
  const drive = getDriveClient();
  const { fileId, role, type, emailAddress, domain, sendNotificationEmail = true, emailMessage, allowFileDiscovery = false } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[ShareFile] Sharing file ${fileId} with ${type}:${emailAddress || domain || 'anyone'} as ${role}`);

  try {
    // Validate parameters
    if ((type === 'user' || type === 'group') && !emailAddress) {
      throw createInvalidParamsError('emailAddress is required for user or group type');
    }

    if (type === 'domain' && !domain) {
      throw createInvalidParamsError('domain is required for domain type');
    }

    // Build permission request
    const permissionRequest: any = {
      role: role,
      type: type,
    };

    if (emailAddress) {
      permissionRequest.emailAddress = emailAddress;
    }

    if (domain) {
      permissionRequest.domain = domain;
    }

    if (type === 'anyone' && allowFileDiscovery) {
      permissionRequest.allowFileDiscovery = true;
    }

    // Create permission
    const response = await drive.permissions.create({
      fileId: fileId,
      requestBody: permissionRequest,
      sendNotificationEmail: sendNotificationEmail,
      emailMessage: emailMessage,
      fields: 'id, type, role, emailAddress, domain, displayName, photoLink, expirationTime, allowFileDiscovery',
    });

    const permission = response.data;

    logger.debug(`[ShareFile] Created permission: ${permission.id}`);

    // Get file info for response
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, webViewLink',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'File shared successfully',
            file: {
              id: fileInfo.data.id,
              name: fileInfo.data.name,
              mimeType: fileInfo.data.mimeType,
              webViewLink: fileInfo.data.webViewLink,
            },
            permission: {
              id: permission.id,
              type: permission.type,
              role: permission.role,
              emailAddress: permission.emailAddress,
              domain: permission.domain,
              displayName: permission.displayName,
              allowFileDiscovery: permission.allowFileDiscovery,
              expirationTime: permission.expirationTime,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to share file');
  }
}

/**
 * Tool 16: List Permissions
 * List all permissions for a file or folder
 */
export interface ListPermissionsParams {
  fileId: string;  // File or folder ID (required)
}

export async function listPermissions(params: ListPermissionsParams) {
  const drive = getDriveClient();
  const { fileId } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[ListPermissions] Listing permissions for file: ${fileId}`);

  try {
    // Get file info
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType, shared, ownedByMe, owners',
    });

    // Get permissions
    const response = await drive.permissions.list({
      fileId: fileId,
      fields: 'permissions(id, type, role, emailAddress, domain, displayName, photoLink, expirationTime, deleted, pendingOwner, allowFileDiscovery)',
    });

    const permissions = response.data.permissions || [];

    logger.debug(`[ListPermissions] Found ${permissions.length} permissions`);

    // Categorize permissions
    const categorized = {
      owners: permissions.filter(p => p.role === 'owner'),
      writers: permissions.filter(p => p.role === 'writer'),
      commenters: permissions.filter(p => p.role === 'commenter'),
      readers: permissions.filter(p => p.role === 'reader'),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            file: {
              id: fileInfo.data.id,
              name: fileInfo.data.name,
              mimeType: fileInfo.data.mimeType,
              shared: fileInfo.data.shared,
              ownedByMe: fileInfo.data.ownedByMe,
            },
            summary: {
              totalPermissions: permissions.length,
              owners: categorized.owners.length,
              writers: categorized.writers.length,
              commenters: categorized.commenters.length,
              readers: categorized.readers.length,
            },
            permissions: permissions.map(p => ({
              id: p.id,
              type: p.type,
              role: p.role,
              emailAddress: p.emailAddress,
              domain: p.domain,
              displayName: p.displayName,
              photoLink: p.photoLink,
              expirationTime: p.expirationTime,
              deleted: p.deleted,
              pendingOwner: p.pendingOwner,
              allowFileDiscovery: p.allowFileDiscovery,
            })),
            categorized: categorized,
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to list permissions');
  }
}

/**
 * Tool 17: Update Permission
 * Update an existing permission (change role)
 */
export interface UpdatePermissionParams {
  fileId: string;  // File or folder ID (required)
  permissionId: string;  // Permission ID to update (required)
  role: 'reader' | 'writer' | 'commenter' | 'owner';  // New role (required)
}

export async function updatePermission(params: UpdatePermissionParams) {
  const drive = getDriveClient();
  const { fileId, permissionId, role } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[UpdatePermission] Updating permission ${permissionId} on file ${fileId} to ${role}`);

  try {
    // Update permission
    const response = await drive.permissions.update({
      fileId: fileId,
      permissionId: permissionId,
      requestBody: {
        role: role,
      },
      fields: 'id, type, role, emailAddress, domain, displayName',
    });

    const permission = response.data;

    logger.debug(`[UpdatePermission] Updated permission: ${permission.id}`);

    // Get file info
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Permission updated successfully',
            file: {
              id: fileInfo.data.id,
              name: fileInfo.data.name,
              mimeType: fileInfo.data.mimeType,
            },
            permission: {
              id: permission.id,
              type: permission.type,
              role: permission.role,
              emailAddress: permission.emailAddress,
              domain: permission.domain,
              displayName: permission.displayName,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to update permission');
  }
}

/**
 * Tool 18: Remove Permission
 * Remove a permission (revoke access)
 */
export interface RemovePermissionParams {
  fileId: string;  // File or folder ID (required)
  permissionId: string;  // Permission ID to remove (required)
}

export async function removePermission(params: RemovePermissionParams) {
  const drive = getDriveClient();
  const { fileId, permissionId } = params;

  // Validate fileId
  validateFileId(fileId, 'fileId');

  logger.debug(`[RemovePermission] Removing permission ${permissionId} from file ${fileId}`);

  try {
    // Get permission info before deleting
    const permissionInfo = await drive.permissions.get({
      fileId: fileId,
      permissionId: permissionId,
      fields: 'id, type, role, emailAddress, domain, displayName',
    });

    const permission = permissionInfo.data;

    // Delete permission
    await drive.permissions.delete({
      fileId: fileId,
      permissionId: permissionId,
    });

    logger.debug(`[RemovePermission] Removed permission: ${permissionId}`);

    // Get file info
    const fileInfo = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, mimeType',
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({
            success: true,
            message: 'Permission removed successfully',
            file: {
              id: fileInfo.data.id,
              name: fileInfo.data.name,
              mimeType: fileInfo.data.mimeType,
            },
            removedPermission: {
              id: permission.id,
              type: permission.type,
              role: permission.role,
              emailAddress: permission.emailAddress,
              domain: permission.domain,
              displayName: permission.displayName,
            },
          }, null, 2),
        },
      ],
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to remove permission');
  }
}
