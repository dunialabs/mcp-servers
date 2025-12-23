/**
 * GitHub Pull Requests Tools
 *
 * Tools for managing GitHub pull requests:
 * - List pull requests
 * - Get PR details
 * - Create pull request
 * - Merge pull request
 * - Get PR diff
 */

import {
  githubGet,
  githubPost,
  githubPut,
  buildQueryString,
} from '../utils/github-api.js';
import { validateRepositoryFormat, validateIssueNumber } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List pull requests in a repository
 */
export async function listPullRequests(params: {
  repo: string;
  state?: 'open' | 'closed' | 'all';
  head?: string;
  base?: string;
  sort?: 'created' | 'updated' | 'popularity';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const {
    repo,
    state = 'open',
    head,
    base,
    sort = 'created',
    direction = 'desc',
    per_page = 30,
    page = 1,
  } = params;

  validateRepositoryFormat(repo);

  const query = buildQueryString({
    state,
    head,
    base,
    sort,
    direction,
    per_page: Math.min(per_page, 100),
    page,
  });

  logger.info(`[listPullRequests] Fetching pull requests`, { repo, state, page });

  const prs = await githubGet(`/repos/${repo}/pulls${query}`);

  const formatted = prs.map((pr: any) => ({
    number: pr.number,
    title: pr.title,
    state: pr.state,
    user: pr.user.login,
    head: `${pr.head.user.login}:${pr.head.ref}`,
    base: pr.base.ref,
    draft: pr.draft,
    mergeable: pr.mergeable,
    comments: pr.comments,
    commits: pr.commits,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    url: pr.html_url,
  }));

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
 * Get pull request details
 */
export async function getPullRequest(params: { repo: string; pull_number: number }) {
  const { repo, pull_number } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[getPullRequest] Fetching pull request`, { repo, pull_number });

  const pr = await githubGet(`/repos/${repo}/pulls/${pull_number}`);

  const formatted = {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    state: pr.state,
    user: pr.user.login,
    head: {
      ref: pr.head.ref,
      sha: pr.head.sha,
      repo: pr.head.repo?.full_name,
    },
    base: {
      ref: pr.base.ref,
      sha: pr.base.sha,
      repo: pr.base.repo.full_name,
    },
    draft: pr.draft,
    mergeable: pr.mergeable,
    mergeable_state: pr.mergeable_state,
    merged: pr.merged,
    comments: pr.comments,
    commits: pr.commits,
    additions: pr.additions,
    deletions: pr.deletions,
    changed_files: pr.changed_files,
    created_at: pr.created_at,
    updated_at: pr.updated_at,
    merged_at: pr.merged_at,
    closed_at: pr.closed_at,
    url: pr.html_url,
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
 * Create a pull request
 */
export async function createPullRequest(params: {
  repo: string;
  title: string;
  head: string;
  base: string;
  body?: string;
  draft?: boolean;
}) {
  const { repo, title, head, base, body, draft = false } = params;

  validateRepositoryFormat(repo);

  logger.info(`[createPullRequest] Creating pull request`, { repo, title, head, base });

  const prData: any = {
    title,
    head,
    base,
    draft,
  };
  if (body) prData.body = body;

  const pr = await githubPost(`/repos/${repo}/pulls`, prData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Pull request created successfully!\n\nNumber: #${pr.number}\nTitle: ${pr.title}\nHead: ${pr.head.ref}\nBase: ${pr.base.ref}\nURL: ${pr.html_url}`,
      },
    ],
  };
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(params: {
  repo: string;
  pull_number: number;
  commit_title?: string;
  commit_message?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
}) {
  const { repo, pull_number, commit_title, commit_message, merge_method = 'merge' } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[mergePullRequest] Merging pull request`, {
    repo,
    pull_number,
    merge_method,
  });

  const mergeData: any = { merge_method };
  if (commit_title) mergeData.commit_title = commit_title;
  if (commit_message) mergeData.commit_message = commit_message;

  const result = await githubPut(`/repos/${repo}/pulls/${pull_number}/merge`, mergeData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Pull request #${pull_number} merged successfully!\n\nSHA: ${result.sha}\nMessage: ${result.message}`,
      },
    ],
  };
}

/**
 * Get pull request diff
 */
export async function getPullRequestDiff(params: { repo: string; pull_number: number }) {
  const { repo, pull_number } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[getPullRequestDiff] Fetching PR diff`, { repo, pull_number });

  // Request diff format
  const diff = await githubGet(`/repos/${repo}/pulls/${pull_number}`, {
    Accept: 'application/vnd.github.v3.diff',
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: diff,
      },
    ],
  };
}
