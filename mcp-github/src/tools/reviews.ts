/**
 * GitHub Pull Request Review Tools
 *
 * Tools for code review on pull requests:
 * - List PR reviews
 * - Create review
 * - List PR files
 * - List PR comments
 */

import { githubGet, githubPost, buildQueryString } from '../utils/github-api.js';
import { validateRepositoryFormat, validateIssueNumber } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List reviews for a pull request
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.pull_number - Pull request number
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listPullRequestReviews(params: {
  repo: string;
  pull_number: number;
  per_page?: number;
  page?: number;
}) {
  const { repo, pull_number, per_page = 30, page = 1 } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[listPullRequestReviews] Fetching PR reviews`, { repo, pull_number, page });

  const query = buildQueryString({
    per_page: Math.min(per_page, 100),
    page,
  });

  const reviews = await githubGet(`/repos/${repo}/pulls/${pull_number}/reviews${query}`);

  const formatted = reviews.map((review: any) => ({
    id: review.id,
    user: review.user.login,
    body: review.body,
    state: review.state,
    submitted_at: review.submitted_at,
    commit_id: review.commit_id,
    url: review.html_url,
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
 * Create a review for a pull request
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.pull_number - Pull request number
 * @param params.body - Review comment body
 * @param params.event - Review action (APPROVE, REQUEST_CHANGES, COMMENT)
 * @param params.comments - Line-specific comments
 */
export async function createReview(params: {
  repo: string;
  pull_number: number;
  body?: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  comments?: Array<{
    path: string;
    position?: number;
    body: string;
    line?: number;
    side?: 'LEFT' | 'RIGHT';
    start_line?: number;
    start_side?: 'LEFT' | 'RIGHT';
  }>;
}) {
  const { repo, pull_number, body, event, comments } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  // Validate that APPROVE and REQUEST_CHANGES have either body or comments
  if ((event === 'APPROVE' || event === 'REQUEST_CHANGES') && !body && (!comments || comments.length === 0)) {
    throw new Error(
      `Review event '${event}' requires either a body message or line-specific comments`
    );
  }

  logger.info(`[createReview] Creating PR review`, { repo, pull_number, event });

  const reviewData: any = { event };
  if (body) reviewData.body = body;
  if (comments && comments.length > 0) reviewData.comments = comments;

  const review = await githubPost(`/repos/${repo}/pulls/${pull_number}/reviews`, reviewData);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Review created successfully!\n\nID: ${review.id}\nState: ${review.state}\nURL: ${review.html_url}`,
      },
    ],
  };
}

/**
 * List files in a pull request
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.pull_number - Pull request number
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listPullRequestFiles(params: {
  repo: string;
  pull_number: number;
  per_page?: number;
  page?: number;
}) {
  const { repo, pull_number, per_page = 30, page = 1 } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[listPullRequestFiles] Fetching PR files`, { repo, pull_number, page });

  const query = buildQueryString({
    per_page: Math.min(per_page, 100),
    page,
  });

  const files = await githubGet(`/repos/${repo}/pulls/${pull_number}/files${query}`);

  const formatted = files.map((file: any) => ({
    filename: file.filename,
    status: file.status,
    additions: file.additions,
    deletions: file.deletions,
    changes: file.changes,
    blob_url: file.blob_url,
    raw_url: file.raw_url,
    patch: file.patch?.substring(0, 1000), // Truncate patch for readability
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
 * List review comments on a pull request
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.pull_number - Pull request number
 * @param params.sort - Sort field (created, updated)
 * @param params.direction - Sort direction (asc, desc)
 * @param params.since - Only comments updated after this time (ISO 8601 format)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listPullRequestComments(params: {
  repo: string;
  pull_number: number;
  sort?: 'created' | 'updated';
  direction?: 'asc' | 'desc';
  since?: string;
  per_page?: number;
  page?: number;
}) {
  const {
    repo,
    pull_number,
    sort = 'created',
    direction = 'asc',
    since,
    per_page = 30,
    page = 1,
  } = params;

  validateRepositoryFormat(repo);
  validateIssueNumber(pull_number);

  logger.info(`[listPullRequestComments] Fetching PR comments`, { repo, pull_number, page });

  const query = buildQueryString({
    sort,
    direction,
    since,
    per_page: Math.min(per_page, 100),
    page,
  });

  const comments = await githubGet(`/repos/${repo}/pulls/${pull_number}/comments${query}`);

  const formatted = comments.map((comment: any) => ({
    id: comment.id,
    user: comment.user.login,
    body: comment.body,
    path: comment.path,
    position: comment.position,
    line: comment.line,
    commit_id: comment.commit_id,
    created_at: comment.created_at,
    updated_at: comment.updated_at,
    url: comment.html_url,
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
