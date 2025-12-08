/**
 * Google Drive File Tree Tool
 * Implements: gdrive_get_tree - Get file hierarchy from a folder
 */

import { getDriveClient, formatBytes, validateFileId } from './common.js';
import type { drive_v3 } from 'googleapis';
import { logger } from '../utils/logger.js';
import { handleGoogleDriveError, validateFolderOrThrow } from '../utils/errors.js';

/**
 * File tree node interface
 */
interface TreeNode {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  webViewLink?: string;
  resourceUri: string;
  isFolder: boolean;
  children?: TreeNode[];
}

/**
 * Fetch children of a folder
 */
async function fetchChildren(
  drive: drive_v3.Drive,
  folderId: string,
  maxDepth: number,
  currentDepth: number
): Promise<TreeNode[]> {
  if (currentDepth >= maxDepth) {
    return [];
  }

  try {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      pageSize: 100,
      fields: 'files(id, name, mimeType, size, modifiedTime, webViewLink)',
      orderBy: 'folder,name',
    });

    const files = response.data.files || [];

    const nodes: TreeNode[] = [];

    for (const file of files) {
      const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

      const node: TreeNode = {
        id: file.id!,
        name: file.name!,
        mimeType: file.mimeType!,
        size: file.size ? formatBytes(parseInt(file.size)) : undefined,
        modifiedTime: file.modifiedTime ?? undefined,
        webViewLink: file.webViewLink ?? undefined,
        resourceUri: `gdrive:///${file.id}`,
        isFolder,
      };

      // Recursively fetch children for folders
      if (isFolder && currentDepth + 1 < maxDepth) {
        node.children = await fetchChildren(drive, file.id!, maxDepth, currentDepth + 1);
      }

      nodes.push(node);
    }

    return nodes;
  } catch (error: any) {
    logger.error(`[Tree] Error fetching children of ${folderId}:`, error.message);
    return [];
  }
}

/**
 * Get root folder (My Drive)
 */
async function getRootFolder(drive: drive_v3.Drive): Promise<TreeNode> {
  try {
    const response = await drive.files.get({
      fileId: 'root',
      fields: 'id, name, mimeType, webViewLink',
    });

    return {
      id: response.data.id!,
      name: response.data.name || 'My Drive',
      mimeType: response.data.mimeType!,
      webViewLink: response.data.webViewLink ?? undefined,
      resourceUri: `gdrive:///${response.data.id}`,
      isFolder: true,
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to get root folder');
  }
}

/**
 * Get folder info by ID
 */
async function getFolderInfo(drive: drive_v3.Drive, folderId: string): Promise<TreeNode> {
  try {
    const response = await drive.files.get({
      fileId: folderId,
      fields: 'id, name, mimeType, size, modifiedTime, webViewLink',
    });

    const file = response.data;
    const isFolder = file.mimeType === 'application/vnd.google-apps.folder';

    if (!isFolder) {
      throw validateFolderOrThrow(file.mimeType!, folderId);
    }

    return {
      id: file.id!,
      name: file.name!,
      mimeType: file.mimeType!,
      size: file.size ? formatBytes(parseInt(file.size)) : undefined,
      modifiedTime: file.modifiedTime ?? undefined,
      webViewLink: file.webViewLink ?? undefined,
      resourceUri: `gdrive:///${file.id}`,
      isFolder: true,
    };
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to get folder info');
  }
}

/**
 * Format tree as text for display
 */
function formatTree(node: TreeNode, prefix: string = '', isLast: boolean = true): string {
  const lines: string[] = [];

  // Current node
  const connector = isLast ? '└── ' : '├── ';
  const icon = node.isFolder ? '📁' : '📄';
  const sizeInfo = node.size ? ` (${node.size})` : '';
  lines.push(`${prefix}${connector}${icon} ${node.name}${sizeInfo}`);

  // Children
  if (node.children && node.children.length > 0) {
    const newPrefix = prefix + (isLast ? '    ' : '│   ');

    node.children.forEach((child, index) => {
      const childIsLast = index === node.children!.length - 1;
      lines.push(formatTree(child, newPrefix, childIsLast));
    });
  }

  return lines.join('\n');
}

/**
 * Tool: Get File Tree
 */
export interface GetTreeParams {
  folderId?: string; // Folder ID to get tree from (default: root/My Drive)
  maxDepth?: number; // Maximum depth to traverse (default: 3)
  format?: 'tree' | 'json'; // Output format (default: tree)
}

export async function getFileTree(params: GetTreeParams) {
  const drive = getDriveClient();

  const folderId = params.folderId || 'root';
  const maxDepth = params.maxDepth || 3;
  const format = params.format || 'tree';

  // Validate folderId
  validateFileId(folderId, 'folderId');

  logger.debug(`[Tree] Getting tree for folder ${folderId}, maxDepth=${maxDepth}, format=${format}`);

  try {
    // Get folder info
    let rootNode: TreeNode;
    if (folderId === 'root') {
      rootNode = await getRootFolder(drive);
    } else {
      rootNode = await getFolderInfo(drive, folderId);
    }

    // Fetch children recursively
    rootNode.children = await fetchChildren(drive, rootNode.id, maxDepth, 0);

    logger.debug(`[Tree] Tree built successfully`);

    // Format output
    if (format === 'json') {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              folder: rootNode,
            }, null, 2),
          },
        ],
      };
    } else {
      // Format as text tree
      const treeText = formatTree(rootNode);

      return {
        content: [
          {
            type: 'text' as const,
            text: `File Tree: ${rootNode.name}\n\n${treeText}\n\n---\n\nTotal files/folders shown. Use maxDepth to see more levels.\nUse format="json" to get structured data with IDs and resource URIs.`,
          },
        ],
      };
    }
  } catch (error: any) {
    throw handleGoogleDriveError(error, 'Failed to get file tree');
  }
}
