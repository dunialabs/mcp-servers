/**
 * Common utilities for Google Drive tools
 */

import { google } from 'googleapis';
import { getCurrentToken } from '../auth/token.js';
import type { drive_v3 } from 'googleapis';
import {
  validateFileIdOrThrow,
  validateMimeTypeOrThrow,
  createInvalidParamsError
} from '../utils/errors.js';

/**
 * Initialize Google Drive API client
 */
export function getDriveClient(): drive_v3.Drive {
  const token = getCurrentToken();

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });

  // googleapis automatically uses HTTP_PROXY/HTTPS_PROXY environment variables
  return google.drive({ version: 'v3', auth });
}

/**
 * Validate Google Drive file/folder ID format
 * Google Drive IDs are typically 28-44 characters, alphanumeric + underscores/hyphens
 *
 * @param fileId - The file or folder ID to validate
 * @param paramName - Parameter name for error messages (default: 'fileId')
 * @throws Error if fileId format is invalid
 *
 * Examples of valid IDs:
 * - "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"
 * - "1a2b3c4d5e6f7g8h9i0j_k-l"
 * - "root" (special case for My Drive root)
 */
export function validateFileId(fileId: string, paramName: string = 'fileId'): void {
  // Use centralized validation that throws McpError
  validateFileIdOrThrow(fileId, paramName);

  // Special case: "root" is always valid
  if (fileId === 'root') {
    return;
  }

  // Google Drive IDs: alphanumeric, hyphens, underscores
  // Length typically 28-44 characters, but allow 10-100 for flexibility
  const driveIdRegex = /^[a-zA-Z0-9_-]{10,100}$/;

  if (!driveIdRegex.test(fileId)) {
    throw createInvalidParamsError(
      `Invalid ${paramName} format: "${fileId}". ` +
      `Expected alphanumeric characters with hyphens/underscores (10-100 chars). ` +
      `Example: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs"`
    );
  }
}

/**
 * Validate MIME type format
 * Google Drive accepts any MIME type matching the pattern "type/subtype"
 * This function only validates the format to prevent injection attacks
 *
 * @param type - MIME type or pattern to validate
 * @throws Error if MIME type format is invalid
 */
export function validateMimeType(type: string): void {
  // Use centralized validation that throws McpError
  validateMimeTypeOrThrow(type);

  // Trim whitespace for validation
  const trimmedType = type.trim();

  // Allow wildcard patterns like 'image/', 'video/', 'audio/', 'text/', 'application/'
  if (trimmedType.endsWith('/')) {
    const prefix = trimmedType.slice(0, -1);
    // Basic validation: no special characters in prefix
    if (!/^[a-zA-Z0-9][a-zA-Z0-9\-+.]*$/.test(prefix)) {
      throw createInvalidParamsError(
        `Invalid MIME type pattern: "${trimmedType}". ` +
        `Pattern must be in format "type/" (e.g., "image/", "video/")`
      );
    }
    return;
  }

  // Disallow asterisk wildcards (use trailing slash instead)
  if (trimmedType.includes('*')) {
    throw createInvalidParamsError(
      `Wildcard MIME types with "*" not supported: "${trimmedType}". ` +
      `Use category patterns like "image/" instead of "image/*".`
    );
  }

  // Validate MIME type format: type/subtype
  // RFC 6838: type and subtype are case-insensitive
  // Type and subtype: alphanumeric + hyphen, dot, plus
  const mimeTypeRegex = /^[a-zA-Z0-9][a-zA-Z0-9\-+.]*\/[a-zA-Z0-9][a-zA-Z0-9\-+.]*$/;

  if (!mimeTypeRegex.test(trimmedType)) {
    throw createInvalidParamsError(
      `Invalid MIME type format: "${trimmedType}". ` +
      `Expected format: "type/subtype" (e.g., "text/plain", "application/json"). ` +
      `Google Drive accepts any valid MIME type.`
    );
  }
}

/**
 * Convert MIME type to export format for Google Workspace files
 */
export function getExportMimeType(mimeType: string): string | null {
  const exportMap: Record<string, string> = {
    'application/vnd.google-apps.document': 'text/plain',
    'application/vnd.google-apps.spreadsheet': 'text/csv',
    'application/vnd.google-apps.presentation': 'text/plain',
    'application/vnd.google-apps.drawing': 'image/png',
  };

  return exportMap[mimeType] || null;
}

/**
 * Check if file is a Google Workspace file
 */
export function isGoogleWorkspaceFile(mimeType: string): boolean {
  return mimeType.startsWith('application/vnd.google-apps.');
}

/**
 * Format bytes to human readable size
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Build Google Drive query from search parameters
 */
export function buildQuery(params: {
  query?: string;
  fileTypes?: string[];
  modifiedAfter?: string;
  owner?: string;
  inFolder?: string;
  sharedWithMe?: boolean;
  starred?: boolean;
  trashed?: boolean;
}): string {
  const conditions: string[] = [];

  // Text query
  if (params.query) {
    conditions.push(`fullText contains '${params.query.replace(/'/g, "\\'")}'`);
  }

  // File types filter
  if (params.fileTypes && params.fileTypes.length > 0) {
    const typeConditions = params.fileTypes.map(type => {
      // Support both MIME types and common names
      if (type === 'document' || type === 'doc') {
        return "mimeType='application/vnd.google-apps.document'";
      } else if (type === 'spreadsheet' || type === 'sheet') {
        return "mimeType='application/vnd.google-apps.spreadsheet'";
      } else if (type === 'presentation' || type === 'slide') {
        return "mimeType='application/vnd.google-apps.presentation'";
      } else if (type === 'pdf') {
        return "mimeType='application/pdf'";
      } else if (type === 'image') {
        return "mimeType contains 'image/'";
      } else if (type === 'folder') {
        return "mimeType='application/vnd.google-apps.folder'";
      } else if (type === 'json') {
        return "mimeType='application/json'";
      } else if (type === 'xml') {
        return "mimeType='application/xml'";
      } else if (type === 'html') {
        return "mimeType='text/html'";
      } else if (type === 'css') {
        return "mimeType='text/css'";
      } else if (type === 'javascript' || type === 'js') {
        return "mimeType='application/javascript'";
      } else if (type === 'zip') {
        return "mimeType='application/zip'";
      } else if (type === 'markdown' || type === 'md') {
        return "mimeType='text/markdown'";
      } else if (type === 'text' || type === 'txt') {
        return "mimeType='text/plain'";
      } else {
        // Validate MIME type format (accepts any valid MIME type)
        validateMimeType(type);
        return `mimeType='${type.replace(/'/g, "\\'")}'`;
      }
    });
    conditions.push(`(${typeConditions.join(' or ')})`);
  }

  // Modified date filter with ISO 8601 validation
  if (params.modifiedAfter) {
    // Validate ISO 8601 format: YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS
    const iso8601Regex = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/;
    if (!iso8601Regex.test(params.modifiedAfter)) {
      throw createInvalidParamsError(
        `Invalid date format for modifiedAfter: "${params.modifiedAfter}". ` +
        `Expected ISO 8601 format (e.g., "2024-01-01" or "2024-01-01T00:00:00Z")`
      );
    }
    conditions.push(`modifiedTime > '${params.modifiedAfter.replace(/'/g, "\\'")}'`);
  }

  // Owner filter
  if (params.owner) {
    conditions.push(`'${params.owner.replace(/'/g, "\\'")}' in owners`);
  }

  // Folder filter
  if (params.inFolder) {
    conditions.push(`'${params.inFolder.replace(/'/g, "\\'")}' in parents`);
  }

  // Shared with me
  if (params.sharedWithMe) {
    conditions.push('sharedWithMe=true');
  }

  // Starred
  if (params.starred) {
    conditions.push('starred=true');
  }

  // Trashed
  if (params.trashed !== undefined) {
    conditions.push(`trashed=${params.trashed}`);
  } else {
    // Default: exclude trashed files
    conditions.push('trashed=false');
  }

  return conditions.join(' and ');
}
