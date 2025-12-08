/**
 * Google Drive MCP Server
 * Registers tools and resources for Google Drive integration
 */

import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { searchFiles, searchAndRetrieve, getFileMetadata } from './tools/search.js';
import { getFileTree } from './tools/tree.js';
import { createFile, updateFile, deleteFile, copyFile } from './tools/file.js';
import { listTrash, restoreFromTrash, emptyTrash } from './tools/trash.js';
import { getFolderStats, batchMoveFiles, batchCopyFiles, batchDeleteFiles } from './tools/batch.js';
import { shareFile, listPermissions, updatePermission, removePermission } from './tools/permission.js';
import { uploadFile, exportFile } from './tools/transfer.js';
import { listRevisions, getRevision, updateRevision, deleteRevision } from './tools/revision.js';
import { readFileResource, listFileResources } from './resources/file.js';
import { logger } from './utils/logger.js';
import { ChangeMonitor, ChangeEvent } from './monitoring/ChangeMonitor.js';

/**
 * Tool schemas using Zod
 */
const SearchParamsSchema = {
  query: z.string().optional().describe('Search query text'),
  fileTypes: z.array(z.string()).optional().describe('File types to filter (e.g., ["document", "spreadsheet", "pdf"])'),
  modifiedAfter: z.string().optional().describe('Filter files modified after this date (ISO 8601 format)'),
  owner: z.string().optional().describe('Filter by owner email'),
  inFolder: z.string().optional().describe('Folder ID to search in'),
  sharedWithMe: z.boolean().optional().describe('Only show files shared with me'),
  starred: z.boolean().optional().describe('Only show starred files'),
  trashed: z.boolean().optional().describe('Include trashed files'),
  limit: z.number().optional().describe('Maximum number of results (default: 20)'),
};

const SearchAndRetrieveParamsSchema = {
  query: z.string().describe('Search query text (required)'),
  fileTypes: z.array(z.string()).optional().describe('File types to filter'),
  modifiedAfter: z.string().optional().describe('Filter files modified after this date'),
  owner: z.string().optional().describe('Filter by owner email'),
  inFolder: z.string().optional().describe('Folder ID to search in'),
  sharedWithMe: z.boolean().optional().describe('Only show files shared with me'),
  maxSize: z.number().optional().describe('Maximum file size to retrieve in MB (default: 10)'),
};

const GetTreeParamsSchema = {
  folderId: z.string().optional().describe('Folder ID to get tree from (default: root/My Drive)'),
  maxDepth: z.number().optional().describe('Maximum depth to traverse (default: 3)'),
  format: z.enum(['tree', 'json']).optional().describe('Output format: "tree" for text tree, "json" for structured data (default: tree)'),
};

const GetFileMetadataParamsSchema = {
  fileId: z.string().describe('File ID to get metadata for (required)'),
  includePermissions: z.boolean().optional().describe('Include permission details (default: true)'),
  includeProperties: z.boolean().optional().describe('Include custom properties (default: false)'),
};

const CreateFileParamsSchema = {
  name: z.string().describe('File name (required)'),
  content: z.string().optional().describe('File content for text files (optional)'),
  mimeType: z.string().optional().describe('MIME type (optional, defaults based on content or to folder)'),
  parentId: z.string().optional().describe('Parent folder ID (optional, defaults to root)'),
  description: z.string().optional().describe('File description (optional)'),
  starred: z.boolean().optional().describe('Star the file (optional, default: false)'),
  folderColorRgb: z.string().optional().describe('Folder color in RGB hex format like #RRGGBB (optional, only for folders)'),
};

const UpdateFileParamsSchema = {
  fileId: z.string().describe('File ID to update (required)'),
  name: z.string().optional().describe('New file name (optional)'),
  content: z.string().optional().describe('New file content (optional, cannot update Google Workspace files)'),
  description: z.string().optional().describe('New description (optional)'),
  starred: z.boolean().optional().describe('Star/unstar the file (optional)'),
  trashed: z.boolean().optional().describe('Move to/from trash (optional)'),
  addParents: z.array(z.string()).optional().describe('Add file to these folder IDs (optional)'),
  removeParents: z.array(z.string()).optional().describe('Remove file from these folder IDs (optional)'),
};

const DeleteFileParamsSchema = {
  fileId: z.string().describe('File ID to delete (required)'),
  permanent: z.boolean().optional().describe('Permanently delete (default: false, moves to trash instead)'),
};

const CopyFileParamsSchema = {
  fileId: z.string().describe('Source file ID to copy (required)'),
  name: z.string().optional().describe('Name for the copied file (optional, defaults to "Copy of [original name]")'),
  parentId: z.string().optional().describe('Target folder ID (optional, defaults to same folder as source)'),
  description: z.string().optional().describe('Description for the copied file (optional)'),
  starred: z.boolean().optional().describe('Star the copied file (optional)'),
};

const ListTrashParamsSchema = {
  limit: z.number().optional().describe('Maximum number of results (default: 50)'),
};

const RestoreFromTrashParamsSchema = {
  fileId: z.string().describe('File ID to restore from trash (required)'),
};

const EmptyTrashParamsSchema = {
  confirm: z.boolean().optional().describe('Confirmation flag - must be true to empty trash (default: false)'),
};

const GetFolderStatsParamsSchema = {
  folderId: z.string().optional().describe('Folder ID (optional, defaults to root)'),
  recursive: z.boolean().optional().describe('Include subfolders recursively (default: true)'),
};

const BatchMoveFilesParamsSchema = {
  fileIds: z.array(z.string()).describe('Array of file IDs to move (required)'),
  targetFolderId: z.string().describe('Target folder ID (required)'),
  removeFromAllParents: z.boolean().optional().describe('Remove from all current parent folders (default: true)'),
};

const BatchCopyFilesParamsSchema = {
  fileIds: z.array(z.string()).describe('Array of file IDs to copy (required)'),
  targetFolderId: z.string().describe('Target folder ID (required)'),
  namePrefix: z.string().optional().describe('Optional prefix for copied files (e.g., "Copy of ")'),
};

const BatchDeleteFilesParamsSchema = {
  fileIds: z.array(z.string()).describe('Array of file IDs to delete (required)'),
  permanent: z.boolean().optional().describe('Permanently delete (default: false, moves to trash)'),
};

const ShareFileParamsSchema = {
  fileId: z.string().describe('File or folder ID to share (required)'),
  role: z.enum(['reader', 'writer', 'commenter', 'owner']).describe('Permission role: reader, writer, commenter, or owner (required)'),
  type: z.enum(['user', 'group', 'domain', 'anyone']).describe('Permission type: user, group, domain, or anyone (required)'),
  emailAddress: z.string().optional().describe('Email address (required for user/group type)'),
  domain: z.string().optional().describe('Domain name (required for domain type)'),
  sendNotificationEmail: z.boolean().optional().describe('Send notification email (default: true)'),
  emailMessage: z.string().optional().describe('Custom message in notification email'),
  allowFileDiscovery: z.boolean().optional().describe('Allow file discovery for anyone type (default: false)'),
};

const ListPermissionsParamsSchema = {
  fileId: z.string().describe('File or folder ID to list permissions for (required)'),
};

const UpdatePermissionParamsSchema = {
  fileId: z.string().describe('File or folder ID (required)'),
  permissionId: z.string().describe('Permission ID to update (required)'),
  role: z.enum(['reader', 'writer', 'commenter', 'owner']).describe('New role (required)'),
};

const RemovePermissionParamsSchema = {
  fileId: z.string().describe('File or folder ID (required)'),
  permissionId: z.string().describe('Permission ID to remove (required)'),
};

const UploadFileParamsSchema = {
  name: z.string().describe('File name (required)'),
  content: z.string().describe('File content in base64 or plain text (required)'),
  mimeType: z.string().optional().describe('MIME type (optional, auto-detected from file extension if not provided)'),
  parentId: z.string().optional().describe('Parent folder ID (optional, defaults to root)'),
  description: z.string().optional().describe('File description (optional)'),
  starred: z.boolean().optional().describe('Star the file (optional, default: false)'),
  isBase64: z.boolean().optional().describe('Whether content is base64 encoded (default: true)'),
};

const ExportFileParamsSchema = {
  fileId: z.string().describe('File ID to export (required)'),
  format: z.string().optional().describe('Export format (optional, auto-selected if not provided). For Docs: pdf/docx/rtf/txt/html/epub/odt. For Sheets: xlsx/ods/csv/pdf/html/tsv. For Slides: pdf/pptx/odp/txt. For Drawings: pdf/png/jpg/svg'),
};

const ListRevisionsParamsSchema = {
  fileId: z.string().describe('File ID to list revisions for (required)'),
  limit: z.number().optional().describe('Maximum number of revisions to return (default: 20, max: 1000)'),
  pageToken: z.string().optional().describe('Page token for pagination'),
};

const GetRevisionParamsSchema = {
  fileId: z.string().describe('File ID (required)'),
  revisionId: z.string().describe('Revision ID to retrieve (required)'),
  download: z.boolean().optional().describe('Download revision content (default: false)'),
};

const UpdateRevisionParamsSchema = {
  fileId: z.string().describe('File ID (required)'),
  revisionId: z.string().describe('Revision ID to update (required)'),
  keepForever: z.boolean().optional().describe('Keep this revision forever (prevents automatic deletion)'),
  published: z.boolean().optional().describe('Publish this revision'),
  publishAuto: z.boolean().optional().describe('Automatically publish future revisions'),
  publishedOutsideDomain: z.boolean().optional().describe('Publish outside domain'),
};

const DeleteRevisionParamsSchema = {
  fileId: z.string().describe('File ID (required)'),
  revisionId: z.string().describe('Revision ID to delete (required, cannot delete revisions marked as "keep forever")'),
};

/**
 * Google Drive MCP Server
 */
export class GoogleDriveMcpServer {
  private server: McpServer;
  private toolHandlers: Map<string, (args: any) => Promise<any>>;
  private changeMonitor: ChangeMonitor | null = null;

  constructor() {
    this.server = new McpServer({
      name: 'google-drive',
      version: '1.1.2',
    });

    // Initialize tool handlers map
    this.toolHandlers = new Map<string, (args: any) => Promise<any>>([
      ['gdriveSearch', searchFiles as (args: any) => Promise<any>],
      ['gdriveSearchAndRetrieve', searchAndRetrieve as (args: any) => Promise<any>],
      ['gdriveGetTree', getFileTree as (args: any) => Promise<any>],
      ['gdriveGetFileMetadata', getFileMetadata as (args: any) => Promise<any>],
      ['gdriveCreateFile', createFile as (args: any) => Promise<any>],
      ['gdriveUpdateFile', updateFile as (args: any) => Promise<any>],
      ['gdriveDeleteFile', deleteFile as (args: any) => Promise<any>],
      ['gdriveCopyFile', copyFile as (args: any) => Promise<any>],
      ['gdriveListTrash', listTrash as (args: any) => Promise<any>],
      ['gdriveRestoreTrash', restoreFromTrash as (args: any) => Promise<any>],
      ['gdriveEmptyTrash', emptyTrash as (args: any) => Promise<any>],
      ['gdriveGetFolderStats', getFolderStats as (args: any) => Promise<any>],
      ['gdriveBatchMove', batchMoveFiles as (args: any) => Promise<any>],
      ['gdriveBatchCopy', batchCopyFiles as (args: any) => Promise<any>],
      ['gdriveBatchDelete', batchDeleteFiles as (args: any) => Promise<any>],
      ['gdriveShare', shareFile as (args: any) => Promise<any>],
      ['gdriveListPermissions', listPermissions as (args: any) => Promise<any>],
      ['gdriveUpdatePermission', updatePermission as (args: any) => Promise<any>],
      ['gdriveRemovePermission', removePermission as (args: any) => Promise<any>],
      ['gdriveUploadFile', uploadFile as (args: any) => Promise<any>],
      ['gdriveExportFile', exportFile as (args: any) => Promise<any>],
      ['gdriveListRevisions', listRevisions as (args: any) => Promise<any>],
      ['gdriveGetRevision', getRevision as (args: any) => Promise<any>],
      ['gdriveUpdateRevision', updateRevision as (args: any) => Promise<any>],
      ['gdriveDeleteRevision', deleteRevision as (args: any) => Promise<any>],
    ]);
  }

  /**
   * Initialize server and register tools/resources
   */
  async initialize() {
    logger.info('[Server] Initializing Google Drive MCP Server');

    // Register token update notification handler
    // This allows peta-core to update the access token without restarting the server
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string(),
        timestamp: z.number().optional()
      }).catchall(z.unknown())
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const { token: newToken, timestamp } = notification.params;

        // Validate token format
        if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
          logger.error('[Token] Invalid token received in notification');
          return;
        }

        // Update environment variable (used by getCurrentToken() in token.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...'
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register tools in order of usage frequency (most used first)

    // Tool 1: Search (Most commonly used)
    this.server.registerTool(
      'gdriveSearch',
      {
        title: 'GDrive - Search Files',
        description: 'Search for files in Google Drive with advanced filters. Supports full-text search, file type filtering, date ranges, and more.',
        inputSchema: SearchParamsSchema,
      },
      async (params: any) => {
        return await searchFiles(params);
      }
    );

    // Tool 2: Search and Retrieve
    this.server.registerTool(
      'gdriveSearchAndRetrieve',
      {
        title: 'GDrive - Search And Retrieve',
        description: 'Search for files and retrieve the content of the first match in one step. Useful for quickly accessing file contents.',
        inputSchema: SearchAndRetrieveParamsSchema,
      },
      async (params: any) => {
        return await searchAndRetrieve(params);
      }
    );

    // Tool 3: Get File Tree
    this.server.registerTool(
      'gdriveGetTree',
      {
        title: 'GDrive - Get Folder Tree',
        description: 'Get the file hierarchy (tree structure) from a folder. Returns folder structure with files and subfolders.',
        inputSchema: GetTreeParamsSchema,
      },
      async (params: any) => {
        return await getFileTree(params);
      }
    );

    // Tool 4: Get File Metadata
    this.server.registerTool(
      'gdriveGetFileMetadata',
      {
        title: 'GDrive - Get File Metadata',
        description: 'Get complete metadata for a specific file, including permissions, timestamps, owners, capabilities, and more.',
        inputSchema: GetFileMetadataParamsSchema,
      },
      async (params: any) => {
        return await getFileMetadata(params);
      }
    );

    // Tool 5: Create File
    this.server.registerTool(
      'gdriveCreateFile',
      {
        title: 'GDrive - Create File',
        description: 'Create a new file or folder in Google Drive. Can create text files with content, empty files, or folders.',
        inputSchema: CreateFileParamsSchema,
      },
      async (params: any) => {
        return await createFile(params);
      }
    );

    // Tool 6: Update File
    this.server.registerTool(
      'gdriveUpdateFile',
      {
        title: 'GDrive - Update File',
        description: 'Update an existing file\'s content or metadata. Can rename, update content, change description, star/unstar, move to/from trash, or move between folders.',
        inputSchema: UpdateFileParamsSchema,
      },
      async (params: any) => {
        return await updateFile(params);
      }
    );

    // Tool 7: Delete File
    this.server.registerTool(
      'gdriveDeleteFile',
      {
        title: 'GDrive - Delete File',
        description: 'Delete a file or folder. By default moves to trash (can be restored). Use permanent=true to permanently delete (cannot be undone).',
        inputSchema: DeleteFileParamsSchema,
      },
      async (params: any) => {
        return await deleteFile(params);
      }
    );

    // Tool 21: Copy File
    this.server.registerTool(
      'gdriveCopyFile',
      {
        title: 'GDrive - Copy File',
        description: 'Create a copy of a file. Can copy to the same folder or a different folder. Works with regular files and Google Workspace files (Docs, Sheets, Slides).',
        inputSchema: CopyFileParamsSchema,
      },
      async (params: any) => {
        return await copyFile(params);
      }
    );

    // Tool 8: List Trash
    this.server.registerTool(
      'gdriveListTrash',
      {
        title: 'GDrive - List Trash',
        description: 'List all files and folders in the trash. Shows trashed items with their metadata.',
        inputSchema: ListTrashParamsSchema,
      },
      async (params: any) => {
        return await listTrash(params);
      }
    );

    // Tool 9: Restore from Trash
    this.server.registerTool(
      'gdriveRestoreTrash',
      {
        title: 'GDrive - Restore From Trash',
        description: 'Restore a file or folder from trash back to its original location.',
        inputSchema: RestoreFromTrashParamsSchema,
      },
      async (params: any) => {
        return await restoreFromTrash(params);
      }
    );

    // Tool 10: Empty Trash (Least frequently used, most dangerous)
    this.server.registerTool(
      'gdriveEmptyTrash',
      {
        title: 'GDrive - Empty Trash',
        description: 'Permanently delete all files in trash. Requires confirm=true. This action cannot be undone.',
        inputSchema: EmptyTrashParamsSchema,
      },
      async (params: any) => {
        return await emptyTrash(params);
      }
    );

    // Tool 11: Get Folder Statistics
    this.server.registerTool(
      'gdriveGetFolderStats',
      {
        title: 'GDrive - Get Folder Statistics',
        description: 'Get statistics about a folder including total size, file count, folder count, and file type breakdown. Supports recursive analysis.',
        inputSchema: GetFolderStatsParamsSchema,
      },
      async (params: any) => {
        return await getFolderStats(params);
      }
    );

    // Tool 12: Batch Move Files
    this.server.registerTool(
      'gdriveBatchMove',
      {
        title: 'GDrive - Batch Move Files',
        description: 'Move multiple files to a target folder in one operation. Returns detailed results for each file.',
        inputSchema: BatchMoveFilesParamsSchema,
      },
      async (params: any) => {
        return await batchMoveFiles(params);
      }
    );

    // Tool 13: Batch Copy Files
    this.server.registerTool(
      'gdriveBatchCopy',
      {
        title: 'GDrive - Batch Copy Files',
        description: 'Copy multiple files to a target folder in one operation. Can add custom prefix to copied files. Supports all file types including Google Workspace files.',
        inputSchema: BatchCopyFilesParamsSchema,
      },
      async (params: any) => {
        return await batchCopyFiles(params);
      }
    );

    // Tool 14: Batch Delete Files
    this.server.registerTool(
      'gdriveBatchDelete',
      {
        title: 'GDrive - Batch Delete Files',
        description: 'Delete multiple files in one operation. By default moves to trash (can be restored). Use permanent=true to permanently delete.',
        inputSchema: BatchDeleteFilesParamsSchema,
      },
      async (params: any) => {
        return await batchDeleteFiles(params);
      }
    );

    // Tool 15: Share File/Folder
    this.server.registerTool(
      'gdriveShare',
      {
        title: 'GDrive - Share File',
        description: 'Share a file or folder with users, groups, or make it public. Set permissions (reader, writer, commenter, owner) and send notification emails.',
        inputSchema: ShareFileParamsSchema,
      },
      async (params: any) => {
        return await shareFile(params);
      }
    );

    // Tool 16: List Permissions
    this.server.registerTool(
      'gdriveListPermissions',
      {
        title: 'GDrive - List Permissions',
        description: 'List all permissions for a file or folder. Shows who has access and their permission levels.',
        inputSchema: ListPermissionsParamsSchema,
      },
      async (params: any) => {
        return await listPermissions(params);
      }
    );

    // Tool 17: Update Permission
    this.server.registerTool(
      'gdriveUpdatePermission',
      {
        title: 'GDrive - Update Permission',
        description: 'Update an existing permission role (e.g., change from reader to writer).',
        inputSchema: UpdatePermissionParamsSchema,
      },
      async (params: any) => {
        return await updatePermission(params);
      }
    );

    // Tool 18: Remove Permission
    this.server.registerTool(
      'gdriveRemovePermission',
      {
        title: 'GDrive - Remove Permission',
        description: 'Remove a permission to revoke access from a user, group, or domain.',
        inputSchema: RemovePermissionParamsSchema,
      },
      async (params: any) => {
        return await removePermission(params);
      }
    );

    // Tool 19: Upload File
    this.server.registerTool(
      'gdriveUploadFile',
      {
        title: 'GDrive - Upload File',
        description: 'Upload a file to Google Drive. Content should be base64 encoded (or plain text with isBase64=false). Supports automatic MIME type detection.',
        inputSchema: UploadFileParamsSchema,
      },
      async (params: any) => {
        return await uploadFile(params);
      }
    );

    // Tool 20: Export File
    this.server.registerTool(
      'gdriveExportFile',
      {
        title: 'GDrive - Export File',
        description: 'Export Google Workspace files (Docs, Sheets, Slides, Drawings) to various formats. Returns base64 encoded file content.',
        inputSchema: ExportFileParamsSchema,
      },
      async (params: any) => {
        return await exportFile(params);
      }
    );

    // Tool 21: List Revisions (Version History)
    this.server.registerTool(
      'gdriveListRevisions',
      {
        title: 'GDrive - List File Revisions',
        description: 'List all revisions (version history) of a file. Shows modification dates, users, and sizes for each version.',
        inputSchema: ListRevisionsParamsSchema,
      },
      async (params: any) => {
        return await listRevisions(params);
      }
    );

    // Tool 22: Get Revision
    this.server.registerTool(
      'gdriveGetRevision',
      {
        title: 'GDrive - Get File Revision',
        description: 'Get details of a specific file revision. Optionally download the revision content.',
        inputSchema: GetRevisionParamsSchema,
      },
      async (params: any) => {
        return await getRevision(params);
      }
    );

    // Tool 23: Update Revision
    this.server.registerTool(
      'gdriveUpdateRevision',
      {
        title: 'GDrive - Update Revision',
        description: 'Update revision properties. Can mark a revision as "keep forever" to prevent automatic deletion.',
        inputSchema: UpdateRevisionParamsSchema,
      },
      async (params: any) => {
        return await updateRevision(params);
      }
    );

    // Tool 24: Delete Revision
    this.server.registerTool(
      'gdriveDeleteRevision',
      {
        title: 'GDrive - Delete Revision',
        description: 'Delete a file revision. Cannot delete revisions marked as "keep forever".',
        inputSchema: DeleteRevisionParamsSchema,
      },
      async (params: any) => {
        return await deleteRevision(params);
      }
    );

    // Register Resource: File Content
    const resourceTemplate = new ResourceTemplate(
      'gdrive:///{fileId}',
      {
        list: async () => {
          return await listFileResources();
        }
      }
    );

    this.server.registerResource(
      'google-drive-files',
      resourceTemplate,
      {
        description: 'Read Google Drive file contents via Resource URI. Replace {fileId} with actual file ID.',
        mimeType: 'application/octet-stream',
      },
      async (uri: URL) => {
        return await readFileResource(uri.toString());
      }
    );

    logger.info('[Server] Registered 25 tools and 1 resource handler');

    // Initialize Change Monitor
    this.initializeChangeMonitor();
  }

  /**
   * Initialize and start the Change Monitor
   *
   * Uses default configuration from ChangeMonitor class:
   * - enabled: true (change monitoring is enabled)
   * - initialInterval: 30000ms (30 seconds)
   * - minInterval: 15000ms (15 seconds when active)
   * - maxInterval: 300000ms (5 minutes when idle)
   * - idleThreshold: 60000ms (1 minute before increasing interval)
   */
  private initializeChangeMonitor(): void {
    try {
      // Create ChangeMonitor instance with default config (enabled by default)
      this.changeMonitor = new ChangeMonitor(
        { enabled: true }, // All other values use defaults from ChangeMonitor
        (changes: ChangeEvent[]) => this.handleChanges(changes)
      );

      // Start monitoring (async, don't block initialization)
      this.changeMonitor.start().catch((error) => {
        logger.error('[Server] Failed to start change monitor:', error);
      });

    } catch (error) {
      logger.error('[Server] Failed to initialize change monitor:', error);
    }
  }

  /**
   * Handle detected changes
   */
  private handleChanges(changes: ChangeEvent[]): void {
    logger.info('[Server] Handling file changes', { count: changes.length });

    // Log changes for debugging
    for (const change of changes) {
      logger.debug('[Server] Change detected:', {
        type: change.type,
        fileId: change.fileId,
        fileName: change.fileName,
      });
    }

    // Send MCP notification: resources/list_changed
    try {
      this.server.server.notification({
        method: 'notifications/resources/list_changed',
        params: {},
      });

      logger.info('[Server] Sent resources/list_changed notification to peta-core');
    } catch (error) {
      logger.error('[Server] Failed to send notification:', error);
    }
  }

  /**
   * Get the underlying MCP server instance
   */
  getServer(): McpServer {
    return this.server;
  }

  /**
   * Connect to transport
   */
  async connect(transport: any) {
    await this.server.connect(transport);
    logger.info('[Server] Connected to transport');
  }

  /**
   * Call a tool directly (for REST API mode)
   */
  async callTool(toolName: string, args: any) {
    logger.debug(`[Server] Calling tool: ${toolName}`);

    const handler = this.toolHandlers.get(toolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    return await handler(args);
  }

  /**
   * Read a resource directly (for REST API mode)
   */
  async readResource(uri: string) {
    logger.debug(`[Server] Reading resource: ${uri}`);
    return await readFileResource(uri);
  }

  /**
   * List resources directly (for REST API mode)
   */
  async listResources() {
    logger.debug('[Server] Listing resources');
    return await listFileResources();
  }

  /**
   * Cleanup resources on server shutdown
   */
  async cleanup() {
    logger.info('[Server] Cleaning up resources...');

    // Stop change monitor
    if (this.changeMonitor) {
      this.changeMonitor.stop();
      logger.info('[Server] Change monitor stopped');
    }

    logger.info('[Server] Cleanup complete');
  }

  /**
   * Get change monitor status (for debugging)
   */
  getChangeMonitorStatus() {
    return this.changeMonitor?.getStatus() || { enabled: false, running: false };
  }
}
