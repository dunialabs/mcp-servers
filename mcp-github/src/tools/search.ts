/**
 * GitHub Search Tools
 *
 * Tools for searching across GitHub:
 * - Search code
 * - Search issues and pull requests
 */

import { githubGet, buildQueryString } from '../utils/github-api.js';
import { logger } from '../utils/logger.js';

/**
 * Search code across GitHub
 *
 * @param params.query - Search query (required)
 * @param params.sort - Sort field (indexed - only available sort option)
 * @param params.order - Sort order (asc, desc)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function searchCode(params: {
  query: string;
  sort?: 'indexed';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const { query, sort, order = 'desc', per_page = 30, page = 1 } = params;

  logger.info(`[searchCode] Searching code`, { query, sort });

  const queryString = buildQueryString({
    q: query,
    sort,
    order,
    per_page: Math.min(per_page, 100),
    page,
  });

  const result = await githubGet(`/search/code${queryString}`);

  // Format results
  const formatted = {
    total_count: result.total_count,
    incomplete_results: result.incomplete_results,
    items: result.items.map((item: any) => ({
      name: item.name,
      path: item.path,
      sha: item.sha,
      repository: {
        name: item.repository.name,
        full_name: item.repository.full_name,
        owner: item.repository.owner.login,
        private: item.repository.private,
        url: item.repository.html_url,
      },
      url: item.html_url,
      git_url: item.git_url,
      score: item.score,
    })),
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
 * Search issues and pull requests across GitHub
 *
 * @param params.query - Search query (required)
 * @param params.sort - Sort field
 * @param params.order - Sort order (asc, desc)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function searchIssues(params: {
  query: string;
  sort?: 'comments' | 'reactions' | 'reactions-+1' | 'reactions--1' | 'reactions-smile' | 'reactions-thinking_face' | 'reactions-heart' | 'reactions-tada' | 'interactions' | 'created' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const { query, sort = 'created', order = 'desc', per_page = 30, page = 1 } = params;

  logger.info(`[searchIssues] Searching issues and PRs`, { query, sort });

  const queryString = buildQueryString({
    q: query,
    sort,
    order,
    per_page: Math.min(per_page, 100),
    page,
  });

  const result = await githubGet(`/search/issues${queryString}`);

  // Format results
  const formatted = {
    total_count: result.total_count,
    incomplete_results: result.incomplete_results,
    items: result.items.map((item: any) => ({
      number: item.number,
      title: item.title,
      state: item.state,
      user: item.user.login,
      labels: item.labels.map((l: any) => l.name),
      comments: item.comments,
      created_at: item.created_at,
      updated_at: item.updated_at,
      closed_at: item.closed_at,
      repository_url: item.repository_url,
      url: item.html_url,
      pull_request: item.pull_request ? true : false,
      score: item.score,
    })),
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
