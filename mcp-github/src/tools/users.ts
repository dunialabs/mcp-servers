/**
 * GitHub Users Tools
 *
 * Tools for managing GitHub users:
 * - Get authenticated user
 * - Get user details
 * - Search users
 */

import { githubGet, buildQueryString } from '../utils/github-api.js';
import { validateUsername } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * Get authenticated user information
 */
export async function getAuthenticatedUser() {
  logger.info(`[getAuthenticatedUser] Fetching authenticated user`);

  const user = await githubGet('/user');

  const formatted = {
    login: user.login,
    id: user.id,
    name: user.name,
    email: user.email,
    bio: user.bio,
    company: user.company,
    blog: user.blog,
    location: user.location,
    twitter_username: user.twitter_username,
    public_repos: user.public_repos,
    public_gists: user.public_gists,
    followers: user.followers,
    following: user.following,
    created_at: user.created_at,
    updated_at: user.updated_at,
    type: user.type,
    url: user.html_url,
    avatar_url: user.avatar_url,
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
 * Get user information
 *
 * @param params.username - GitHub username
 */
export async function getUser(params: { username: string }) {
  const { username } = params;

  validateUsername(username);

  logger.info(`[getUser] Fetching user`, { username });

  const user = await githubGet(`/users/${username}`);

  const formatted = {
    login: user.login,
    id: user.id,
    name: user.name,
    bio: user.bio,
    company: user.company,
    blog: user.blog,
    location: user.location,
    twitter_username: user.twitter_username,
    public_repos: user.public_repos,
    public_gists: user.public_gists,
    followers: user.followers,
    following: user.following,
    created_at: user.created_at,
    updated_at: user.updated_at,
    type: user.type,
    url: user.html_url,
    avatar_url: user.avatar_url,
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
 * Search users
 *
 * @param params.query - Search query (required)
 * @param params.sort - Sort field (followers, repositories, joined)
 * @param params.order - Sort order (asc, desc)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function searchUsers(params: {
  query: string;
  sort?: 'followers' | 'repositories' | 'joined';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const { query, sort = 'followers', order = 'desc', per_page = 30, page = 1 } = params;

  logger.info(`[searchUsers] Searching users`, { query, sort });

  const queryString = buildQueryString({
    q: query,
    sort,
    order,
    per_page: Math.min(per_page, 100),
    page,
  });

  const result = await githubGet(`/search/users${queryString}`);

  const formatted = {
    total_count: result.total_count,
    incomplete_results: result.incomplete_results,
    items: result.items.map((user: any) => ({
      login: user.login,
      id: user.id,
      type: user.type,
      site_admin: user.site_admin,
      url: user.html_url,
      avatar_url: user.avatar_url,
      score: user.score,
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
