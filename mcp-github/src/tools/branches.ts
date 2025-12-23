/**
 * GitHub Branches Tools
 *
 * Tools for managing Git branches:
 * - List branches
 * - Get branch details
 * - Create branch
 * - Delete branch
 */

import { githubGet, githubPost, githubDelete, buildQueryString } from '../utils/github-api.js';
import { validateRepositoryFormat, validateBranchName } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List branches in a repository
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.protected - Filter by protected status
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listBranches(params: {
  repo: string;
  protected?: boolean;
  per_page?: number;
  page?: number;
}) {
  const { repo, protected: isProtected, per_page = 30, page = 1 } = params;

  validateRepositoryFormat(repo);

  logger.info(`[listBranches] Fetching branches`, { repo, protected: isProtected, page });

  // Build query string
  const query = buildQueryString({
    protected: isProtected,
    per_page: Math.min(per_page, 100),
    page,
  });

  const branches = await githubGet(`/repos/${repo}/branches${query}`);

  // Format response
  const formattedBranches = branches.map((branch: any) => ({
    name: branch.name,
    protected: branch.protected,
    commit: {
      sha: branch.commit.sha,
      url: branch.commit.url,
    },
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedBranches, null, 2),
      },
    ],
  };
}

/**
 * Get a branch
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.branch - Branch name
 */
export async function getBranch(params: { repo: string; branch: string }) {
  const { repo, branch } = params;

  validateRepositoryFormat(repo);

  logger.info(`[getBranch] Fetching branch details`, { repo, branch });

  const branchData = await githubGet(`/repos/${repo}/branches/${branch}`);

  // Format comprehensive branch information
  const formatted = {
    name: branchData.name,
    protected: branchData.protected,
    protection: branchData.protection,
    protection_url: branchData.protection_url,
    commit: {
      sha: branchData.commit.sha,
      node_id: branchData.commit.node_id,
      message: branchData.commit.commit.message,
      author: {
        name: branchData.commit.commit.author.name,
        email: branchData.commit.commit.author.email,
        date: branchData.commit.commit.author.date,
      },
      committer: {
        name: branchData.commit.commit.committer.name,
        email: branchData.commit.commit.committer.email,
        date: branchData.commit.commit.committer.date,
      },
      parents: branchData.commit.parents.map((p: any) => ({
        sha: p.sha,
        url: p.html_url,
      })),
      url: branchData.commit.html_url,
    },
  };

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formatted, null, 2),
      },
    ],
  };
}

/**
 * Create a branch (by creating a reference)
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.branch - New branch name
 * @param params.from_branch - Source branch name (defaults to repository's default branch)
 * @param params.from_sha - Source commit SHA (alternative to from_branch)
 */
export async function createBranch(params: {
  repo: string;
  branch: string;
  from_branch?: string;
  from_sha?: string;
}) {
  const { repo, branch, from_branch, from_sha } = params;

  validateRepositoryFormat(repo);
  validateBranchName(branch);

  logger.info(`[createBranch] Creating branch`, { repo, branch, from_branch, from_sha });

  let sha: string;

  if (from_sha) {
    // Use provided SHA directly
    sha = from_sha;
    logger.info(`[createBranch] Using provided SHA: ${sha}`);
  } else {
    // Get SHA from branch or default branch
    try {
      if (from_branch) {
        validateBranchName(from_branch);
        logger.info(`[createBranch] Getting SHA from branch: ${from_branch}`);
        const branchData = await githubGet(`/repos/${repo}/branches/${from_branch}`);
        sha = branchData.commit.sha;
      } else {
        logger.info(`[createBranch] Getting SHA from default branch`);
        const repoData = await githubGet(`/repos/${repo}`);
        const defaultBranch = repoData.default_branch;
        const branchData = await githubGet(`/repos/${repo}/branches/${defaultBranch}`);
        sha = branchData.commit.sha;
      }
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(
          `Source branch "${from_branch || 'default'}" not found. Please provide a valid from_branch or from_sha.`
        );
      }
      throw error;
    }
  }

  // Create the branch by creating a reference
  const ref = await githubPost(`/repos/${repo}/git/refs`, {
    ref: `refs/heads/${branch}`,
    sha,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: `Branch created successfully!\n\nBranch: ${branch}\nSHA: ${sha}\nRef: ${ref.ref}\nURL: ${ref.url}`,
      },
    ],
  };
}

/**
 * Delete a branch (by deleting the reference)
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.branch - Branch name to delete
 */
export async function deleteBranch(params: { repo: string; branch: string }) {
  const { repo, branch } = params;

  validateRepositoryFormat(repo);
  validateBranchName(branch);

  logger.info(`[deleteBranch] Deleting branch`, { repo, branch });

  // Delete the branch by deleting the reference
  await githubDelete(`/repos/${repo}/git/refs/heads/${branch}`);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Branch deleted successfully!\n\nBranch: ${branch}`,
      },
    ],
  };
}
