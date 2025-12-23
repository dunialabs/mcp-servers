/**
 * GitHub File Operations Tools
 *
 * Tools for direct file manipulation:
 * - Create or update file
 * - Delete file
 */

import { githubPut, githubDelete } from '../utils/github-api.js';
import { validateRepositoryFormat } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Create or update a file in a repository
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.path - File path in repository
 * @param params.message - Commit message
 * @param params.content - File content (plain text, will be automatically base64 encoded)
 * @param params.branch - Branch name (defaults to repository's default branch)
 * @param params.sha - Blob SHA of the file being replaced (required for updates)
 */
export async function createOrUpdateFile(params: {
  repo: string;
  path: string;
  message: string;
  content: string;
  branch?: string;
  sha?: string;
}) {
  const { repo, path, message, content, branch, sha } = params;

  validateRepositoryFormat(repo);

  // Validate file path
  if (!path || path.trim() === '') {
    throw new Error('File path cannot be empty');
  }
  if (path.includes('..')) {
    throw new Error('File path cannot contain ".." (path traversal attempt)');
  }
  if (path.length > 4096) {
    throw new Error('File path is too long (max 4096 characters)');
  }

  logger.info(`[createOrUpdateFile] ${sha ? 'Updating' : 'Creating'} file`, {
    repo,
    path,
    branch,
  });

  // Always encode content to base64 (GitHub API requires base64)
  // Users should provide plain text content
  const encodedContent = Buffer.from(content, 'utf-8').toString('base64');

  const fileData: any = {
    message,
    content: encodedContent,
  };

  if (branch) fileData.branch = branch;
  if (sha) fileData.sha = sha;

  const result = await githubPut(`/repos/${repo}/contents/${path}`, fileData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `File ${sha ? 'updated' : 'created'} successfully!\n\nPath: ${path}\nCommit SHA: ${result.commit.sha}\nCommit message: ${result.commit.message}\nURL: ${result.content.html_url}`,
      },
    ],
  };
}

/**
 * Delete a file from a repository
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.path - File path in repository
 * @param params.message - Commit message
 * @param params.sha - Blob SHA of the file being removed (required)
 * @param params.branch - Branch name (defaults to repository's default branch)
 */
export async function deleteFile(params: {
  repo: string;
  path: string;
  message: string;
  sha: string;
  branch?: string;
}) {
  const { repo, path, message, sha, branch } = params;

  validateRepositoryFormat(repo);

  // Validate file path
  if (!path || path.trim() === '') {
    throw new Error('File path cannot be empty');
  }
  if (path.includes('..')) {
    throw new Error('File path cannot contain ".." (path traversal attempt)');
  }
  if (path.length > 4096) {
    throw new Error('File path is too long (max 4096 characters)');
  }

  logger.info(`[deleteFile] Deleting file`, { repo, path, branch });

  // GitHub API requires sending the file SHA in the request body
  const deleteData: any = {
    message,
    sha,
  };

  if (branch) deleteData.branch = branch;

  const result = await githubDelete(`/repos/${repo}/contents/${path}`, deleteData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `File deleted successfully!\n\nPath: ${path}\nCommit SHA: ${result.commit.sha}\nCommit message: ${result.commit.message}`,
      },
    ],
  };
}
