/**
 * GitHub Commits Tools
 *
 * Tools for working with Git commits:
 * - List commits in a repository
 * - Get commit details
 * - Compare commits
 */

import { githubGet, buildQueryString } from '../utils/github-api.js';
import { validateRepositoryFormat } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List commits in a repository
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.sha - SHA or branch to start listing commits from
 * @param params.path - Only commits containing this file path
 * @param params.author - GitHub username or email address
 * @param params.since - Only commits after this date (ISO 8601 format)
 * @param params.until - Only commits before this date (ISO 8601 format)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listCommits(params: {
  repo: string;
  sha?: string;
  path?: string;
  author?: string;
  since?: string;
  until?: string;
  per_page?: number;
  page?: number;
}) {
  const { repo, sha, path, author, since, until, per_page = 30, page = 1 } = params;

  validateRepositoryFormat(repo);

  logger.info(`[listCommits] Fetching commits`, { repo, sha, path, page });

  // Build query string
  const query = buildQueryString({
    sha,
    path,
    author,
    since,
    until,
    per_page: Math.min(per_page, 100),
    page,
  });

  const commits = await githubGet(`/repos/${repo}/commits${query}`);

  // Format response
  const formattedCommits = commits.map((commit: any) => ({
    sha: commit.sha,
    message: commit.commit.message,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      date: commit.commit.author.date,
      login: commit.author?.login,
    },
    committer: {
      name: commit.commit.committer.name,
      email: commit.commit.committer.email,
      date: commit.commit.committer.date,
      login: commit.committer?.login,
    },
    parents: commit.parents.map((p: any) => ({
      sha: p.sha,
      url: p.html_url,
    })),
    url: commit.html_url,
    comment_count: commit.commit.comment_count,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedCommits, null, 2),
      },
    ],
  };
}

/**
 * Get a single commit
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.ref - The commit reference (SHA, branch name, or tag name)
 */
export async function getCommit(params: { repo: string; ref: string }) {
  const { repo, ref } = params;

  validateRepositoryFormat(repo);

  logger.info(`[getCommit] Fetching commit`, { repo, ref });

  const commit = await githubGet(`/repos/${repo}/commits/${ref}`);

  // Format comprehensive commit information
  const formatted = {
    sha: commit.sha,
    message: commit.commit.message,
    author: {
      name: commit.commit.author.name,
      email: commit.commit.author.email,
      date: commit.commit.author.date,
      login: commit.author?.login,
      avatar_url: commit.author?.avatar_url,
    },
    committer: {
      name: commit.commit.committer.name,
      email: commit.commit.committer.email,
      date: commit.commit.committer.date,
      login: commit.committer?.login,
      avatar_url: commit.committer?.avatar_url,
    },
    parents: commit.parents.map((p: any) => ({
      sha: p.sha,
      url: p.html_url,
    })),
    stats: {
      total: commit.stats.total,
      additions: commit.stats.additions,
      deletions: commit.stats.deletions,
    },
    files: commit.files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
      patch: file.patch?.substring(0, 500), // Truncate patch for readability
    })),
    url: commit.html_url,
    comment_count: commit.commit.comment_count,
    verification: commit.commit.verification,
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
 * Compare two commits
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.base - The base branch, tag, or commit SHA
 * @param params.head - The head branch, tag, or commit SHA
 */
export async function compareCommits(params: { repo: string; base: string; head: string }) {
  const { repo, base, head } = params;

  validateRepositoryFormat(repo);

  // Validate that base and head are different
  if (base === head) {
    throw new Error(
      `Cannot compare a commit with itself. base and head must be different (both are: "${base}")`
    );
  }

  logger.info(`[compareCommits] Comparing commits`, { repo, base, head });

  const comparison = await githubGet(`/repos/${repo}/compare/${base}...${head}`);

  // Format comparison information
  const formatted = {
    status: comparison.status,
    ahead_by: comparison.ahead_by,
    behind_by: comparison.behind_by,
    total_commits: comparison.total_commits,
    base_commit: {
      sha: comparison.base_commit.sha,
      message: comparison.base_commit.commit.message,
      author: comparison.base_commit.commit.author.name,
      date: comparison.base_commit.commit.author.date,
      url: comparison.base_commit.html_url,
    },
    merge_base_commit: {
      sha: comparison.merge_base_commit.sha,
      message: comparison.merge_base_commit.commit.message,
      author: comparison.merge_base_commit.commit.author.name,
      date: comparison.merge_base_commit.commit.author.date,
      url: comparison.merge_base_commit.html_url,
    },
    commits: comparison.commits.map((commit: any) => ({
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      date: commit.commit.author.date,
      url: commit.html_url,
    })),
    files: comparison.files.map((file: any) => ({
      filename: file.filename,
      status: file.status,
      additions: file.additions,
      deletions: file.deletions,
      changes: file.changes,
    })),
    diff_url: comparison.diff_url,
    patch_url: comparison.patch_url,
    url: comparison.html_url,
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
