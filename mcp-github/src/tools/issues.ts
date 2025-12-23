/**
 * GitHub Issues Tools
 *
 * Tools for managing GitHub issues:
 * - List issues
 * - Get issue details
 * - Create issue
 * - Update issue
 * - Add comment to issue
 */

import {
  githubGet,
  githubPost,
  githubPatch,
  buildQueryString,
} from '../utils/github-api.js';
import { validateRepositoryFormat, validateIssueNumber } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List issues in a repository
 */
export async function listIssues(params: {
  repo: string;
  state?: 'open' | 'closed' | 'all';
  labels?: string[];
  sort?: 'created' | 'updated' | 'comments';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const {
    repo,
    state = 'open',
    labels,
    sort = 'created',
    direction = 'desc',
    per_page = 30,
    page = 1,
  } = params;

  validateRepositoryFormat(repo);

  const query = buildQueryString({
    state,
    labels: labels?.join(','),
    sort,
    direction,
    per_page: Math.min(per_page, 100),
    page,
  });

  logger.info(`[listIssues] Fetching issues`, { repo, state, page });

  const issues = await githubGet(`/repos/${repo}/issues${query}`);

  const formatted = issues.map((issue: any) => ({
    number: issue.number,
    title: issue.title,
    state: issue.state,
    user: issue.user.login,
    labels: issue.labels.map((l: any) => l.name),
    comments: issue.comments,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    url: issue.html_url,
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
 * Get issue details
 */
export async function getIssue(params: { repo: string; issue_number: number }) {
  const { repo, issue_number } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(issue_number);

  logger.info(`[getIssue] Fetching issue`, { repo, issue_number });

  const issue = await githubGet(`/repos/${repo}/issues/${issue_number}`);

  const formatted = {
    number: issue.number,
    title: issue.title,
    body: issue.body,
    state: issue.state,
    user: issue.user.login,
    labels: issue.labels.map((l: any) => l.name),
    assignees: issue.assignees.map((a: any) => a.login),
    comments: issue.comments,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
    closed_at: issue.closed_at,
    url: issue.html_url,
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
 * Create a new issue
 */
export async function createIssue(params: {
  repo: string;
  title: string;
  body?: string;
  labels?: string[];
  assignees?: string[];
}) {
  const { repo, title, body, labels, assignees } = params;

  validateRepositoryFormat(repo);

  logger.info(`[createIssue] Creating issue`, { repo, title });

  const issueData: any = { title };
  if (body) issueData.body = body;
  if (labels) issueData.labels = labels;
  if (assignees) issueData.assignees = assignees;

  const issue = await githubPost(`/repos/${repo}/issues`, issueData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Issue created successfully!\n\nNumber: #${issue.number}\nTitle: ${issue.title}\nURL: ${issue.html_url}`,
      },
    ],
  };
}

/**
 * Update an issue
 */
export async function updateIssue(params: {
  repo: string;
  issue_number: number;
  title?: string;
  body?: string;
  state?: 'open' | 'closed';
  labels?: string[];
}) {
  const { repo, issue_number, title, body, state, labels } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(issue_number);

  logger.info(`[updateIssue] Updating issue`, { repo, issue_number });

  const updateData: any = {};
  if (title) updateData.title = title;
  if (body) updateData.body = body;
  if (state) updateData.state = state;
  if (labels) updateData.labels = labels;

  const issue = await githubPatch(`/repos/${repo}/issues/${issue_number}`, updateData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Issue updated successfully!\n\nNumber: #${issue.number}\nTitle: ${issue.title}\nState: ${issue.state}\nURL: ${issue.html_url}`,
      },
    ],
  };
}

/**
 * Add a comment to an issue
 */
export async function addIssueComment(params: {
  repo: string;
  issue_number: number;
  body: string;
}) {
  const { repo, issue_number, body } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(issue_number);

  logger.info(`[addIssueComment] Adding comment to issue`, { repo, issue_number });

  const comment = await githubPost(`/repos/${repo}/issues/${issue_number}/comments`, {
    body,
  });

  return {
    content: [
      {
        type: 'text' as const,
        text: `Comment added successfully!\n\nIssue: #${issue_number}\nComment URL: ${comment.html_url}`,
      },
    ],
  };
}
