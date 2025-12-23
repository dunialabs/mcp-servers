/**
 * GitHub Repository Tools
 *
 * Tools for managing GitHub repositories:
 * - List user/org repositories
 * - Get repository details
 * - Create repository
 * - Fork repository
 * - Search repositories
 * - Get file contents
 */

import { githubGet, githubPost, buildQueryString } from '../utils/github-api.js';
import { validateRepositoryFormat, validateUsername } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List repositories for a user or organization
 *
 * @param params.username - GitHub username or org name (optional, defaults to authenticated user)
 * @param params.type - Repository type filter
 * @param params.sort - Sort field
 * @param params.direction - Sort direction
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listRepositories(params: {
  username?: string;
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const {
    username,
    type = 'all',
    sort = 'updated',
    direction = 'desc',
    per_page = 30,
    page = 1,
  } = params;

  // Validate username if provided
  if (username) {
    validateUsername(username);
  }

  // Build endpoint
  const endpoint = username ? `/users/${username}/repos` : '/user/repos';

  // Build query string
  const query = buildQueryString({
    type,
    sort,
    direction,
    per_page: Math.min(per_page, 100),
    page,
  });

  logger.info(`[listRepositories] Fetching repositories`, {
    username: username || 'authenticated user',
    type,
    sort,
    page,
  });

  const repos = await githubGet(`${endpoint}${query}`);

  // Format response
  const formattedRepos = repos.map((repo: any) => ({
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    private: repo.private,
    fork: repo.fork,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    size: repo.size,
    stargazers_count: repo.stargazers_count,
    watchers_count: repo.watchers_count,
    language: repo.language,
    forks_count: repo.forks_count,
    open_issues_count: repo.open_issues_count,
    default_branch: repo.default_branch,
    url: repo.html_url,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedRepos, null, 2),
      },
    ],
  };
}

/**
 * Get repository details
 *
 * @param params.repo - Repository in "owner/repo" format
 */
export async function getRepository(params: { repo: string }) {
  const { repo } = params;

  validateRepositoryFormat(repo);

  logger.info(`[getRepository] Fetching repository details`, { repo });

  const repository = await githubGet(`/repos/${repo}`);

  // Format comprehensive repository information
  const formatted = {
    name: repository.name,
    full_name: repository.full_name,
    description: repository.description,
    private: repository.private,
    fork: repository.fork,
    owner: {
      login: repository.owner.login,
      type: repository.owner.type,
      url: repository.owner.html_url,
    },
    created_at: repository.created_at,
    updated_at: repository.updated_at,
    pushed_at: repository.pushed_at,
    size: repository.size,
    stargazers_count: repository.stargazers_count,
    watchers_count: repository.watchers_count,
    language: repository.language,
    forks_count: repository.forks_count,
    open_issues_count: repository.open_issues_count,
    default_branch: repository.default_branch,
    topics: repository.topics,
    visibility: repository.visibility,
    permissions: repository.permissions,
    license: repository.license?.name,
    url: repository.html_url,
    clone_url: repository.clone_url,
    ssh_url: repository.ssh_url,
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
 * Create a new repository
 *
 * @param params.name - Repository name (required)
 * @param params.description - Repository description
 * @param params.private - Whether the repository is private
 * @param params.auto_init - Initialize with README
 * @param params.gitignore_template - .gitignore template
 * @param params.license_template - License template
 */
export async function createRepository(params: {
  name: string;
  description?: string;
  private?: boolean;
  auto_init?: boolean;
  gitignore_template?: string;
  license_template?: string;
}) {
  const {
    name,
    description,
    private: isPrivate = false,
    auto_init = false,
    gitignore_template,
    license_template,
  } = params;

  logger.info(`[createRepository] Creating repository`, { name, private: isPrivate });

  const body: any = {
    name,
    private: isPrivate,
    auto_init,
  };

  if (description) body.description = description;
  if (gitignore_template) body.gitignore_template = gitignore_template;
  if (license_template) body.license_template = license_template;

  const repository = await githubPost('/user/repos', body);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Repository created successfully!\n\nName: ${repository.full_name}\nURL: ${repository.html_url}\nClone URL: ${repository.clone_url}`,
      },
    ],
  };
}

/**
 * Fork a repository
 *
 * @param params.repo - Repository to fork in "owner/repo" format
 * @param params.organization - Organization to fork to (optional)
 */
export async function forkRepository(params: { repo: string; organization?: string }) {
  const { repo, organization } = params;

  validateRepositoryFormat(repo);

  logger.info(`[forkRepository] Forking repository`, { repo, organization });

  const body: any = {};
  if (organization) {
    body.organization = organization;
  }

  const fork = await githubPost(`/repos/${repo}/forks`, body);

  return {
    content: [
      {
        type: 'text' as const,
        text: `Repository forked successfully!\n\nOriginal: ${repo}\nFork: ${fork.full_name}\nURL: ${fork.html_url}`,
      },
    ],
  };
}

/**
 * Search repositories
 *
 * @param params.query - Search query (required)
 * @param params.sort - Sort field
 * @param params.order - Sort order
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function searchRepositories(params: {
  query: string;
  sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
  order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}) {
  const { query, sort = 'stars', order = 'desc', per_page = 30, page = 1 } = params;

  logger.info(`[searchRepositories] Searching repositories`, { query, sort });

  const queryString = buildQueryString({
    q: query,
    sort,
    order,
    per_page: Math.min(per_page, 100),
    page,
  });

  const result = await githubGet(`/search/repositories${queryString}`);

  // Format results
  const formatted = {
    total_count: result.total_count,
    incomplete_results: result.incomplete_results,
    items: result.items.map((repo: any) => ({
      name: repo.name,
      full_name: repo.full_name,
      description: repo.description,
      owner: repo.owner.login,
      private: repo.private,
      stargazers_count: repo.stargazers_count,
      forks_count: repo.forks_count,
      language: repo.language,
      url: repo.html_url,
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
 * Get file contents from a repository
 *
 * @param params.repo - Repository in "owner/repo" format
 * @param params.path - File path in repository
 * @param params.ref - Branch, tag, or commit (optional, defaults to default branch)
 */
export async function getFileContents(params: { repo: string; path: string; ref?: string }) {
  const { repo, path, ref } = params;

  validateRepositoryFormat(repo);

  logger.info(`[getFileContents] Fetching file contents`, { repo, path, ref });

  const query = ref ? buildQueryString({ ref }) : '';
  const file = await githubGet(`/repos/${repo}/contents/${path}${query}`);

  // Handle directory listing
  if (Array.isArray(file)) {
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(file, null, 2),
        },
      ],
    };
  }

  // Decode base64 content if it's a file
  let content = file.content;
  if (file.type === 'file' && file.encoding === 'base64' && file.content) {
    try {
      content = Buffer.from(file.content, 'base64').toString('utf-8');
    } catch (error) {
      logger.error(`[getFileContents] Failed to decode base64 content`, { error });
      content = file.content; // Fallback to raw content
    }
  }

  return {
    content: [
      {
        type: 'text' as const,
        text: content || JSON.stringify(file, null, 2),
      },
    ],
  };
}
