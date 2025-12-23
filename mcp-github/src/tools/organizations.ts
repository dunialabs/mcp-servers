/**
 * GitHub Organizations and Teams Tools
 *
 * Tools for managing GitHub organizations and teams:
 * - List organizations
 * - Get organization details
 * - List teams
 * - Get team details
 * - List team members
 *
 * Includes GitHub MCP Server "context" toolset
 */

import { githubGet, buildQueryString } from '../utils/github-api.js';
import { validateUsername } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

/**
 * List organizations for a user
 *
 * @param params.username - GitHub username (optional, defaults to authenticated user)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listOrganizations(params: {
  username?: string;
  per_page?: number;
  page?: number;
}) {
  const { username, per_page = 30, page = 1 } = params;

  // Validate username if provided
  if (username) {
    validateUsername(username);
  }

  // Build endpoint
  const endpoint = username ? `/users/${username}/orgs` : '/user/orgs';

  // Build query string
  const query = buildQueryString({
    per_page: Math.min(per_page, 100),
    page,
  });

  logger.info(`[listOrganizations] Fetching organizations`, {
    username: username || 'authenticated user',
    page,
  });

  const orgs = await githubGet(`${endpoint}${query}`);

  // Format response
  const formattedOrgs = orgs.map((org: any) => ({
    login: org.login,
    id: org.id,
    description: org.description,
    url: org.html_url,
    avatar_url: org.avatar_url,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedOrgs, null, 2),
      },
    ],
  };
}

/**
 * Get organization details
 *
 * @param params.org - Organization login name
 */
export async function getOrganization(params: { org: string }) {
  const { org } = params;

  validateUsername(org);

  logger.info(`[getOrganization] Fetching organization details`, { org });

  const organization = await githubGet(`/orgs/${org}`);

  // Format comprehensive organization information
  const formatted = {
    login: organization.login,
    id: organization.id,
    name: organization.name,
    description: organization.description,
    email: organization.email,
    blog: organization.blog,
    location: organization.location,
    twitter_username: organization.twitter_username,
    company: organization.company,
    created_at: organization.created_at,
    updated_at: organization.updated_at,
    public_repos: organization.public_repos,
    public_gists: organization.public_gists,
    followers: organization.followers,
    following: organization.following,
    type: organization.type,
    url: organization.html_url,
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
 * List teams for a user or organization
 * (GitHub MCP Server "context" toolset: get_teams)
 *
 * @param params.org - Organization login name (optional for user's teams)
 * @param params.username - Username to list teams for (only when org not specified)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listTeams(params: {
  org?: string;
  username?: string;
  per_page?: number;
  page?: number;
}) {
  const { org, username, per_page = 30, page = 1 } = params;

  let endpoint: string;

  if (org) {
    // List teams in an organization
    validateUsername(org);
    endpoint = `/orgs/${org}/teams`;
    logger.info(`[listTeams] Fetching teams for organization`, { org, page });
  } else if (username) {
    // List teams for a specific user
    validateUsername(username);
    endpoint = `/users/${username}/teams`;
    logger.info(`[listTeams] Fetching teams for user`, { username, page });
  } else {
    // List teams for authenticated user
    endpoint = '/user/teams';
    logger.info(`[listTeams] Fetching teams for authenticated user`, { page });
  }

  // Build query string
  const query = buildQueryString({
    per_page: Math.min(per_page, 100),
    page,
  });

  const teams = await githubGet(`${endpoint}${query}`);

  // Format response
  const formattedTeams = teams.map((team: any) => ({
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    privacy: team.privacy,
    permission: team.permission,
    members_count: team.members_count,
    repos_count: team.repos_count,
    organization: team.organization?.login,
    url: team.html_url,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedTeams, null, 2),
      },
    ],
  };
}

/**
 * Get team details
 *
 * @param params.org - Organization login name
 * @param params.team_slug - Team slug identifier
 */
export async function getTeam(params: { org: string; team_slug: string }) {
  const { org, team_slug } = params;

  validateUsername(org);

  logger.info(`[getTeam] Fetching team details`, { org, team_slug });

  const team = await githubGet(`/orgs/${org}/teams/${team_slug}`);

  // Format comprehensive team information
  const formatted = {
    id: team.id,
    name: team.name,
    slug: team.slug,
    description: team.description,
    privacy: team.privacy,
    notification_setting: team.notification_setting,
    permission: team.permission,
    members_count: team.members_count,
    repos_count: team.repos_count,
    created_at: team.created_at,
    updated_at: team.updated_at,
    organization: {
      login: team.organization.login,
      id: team.organization.id,
      url: team.organization.html_url,
    },
    parent: team.parent
      ? {
          id: team.parent.id,
          name: team.parent.name,
          slug: team.parent.slug,
        }
      : null,
    url: team.html_url,
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
 * List team members
 * (GitHub MCP Server "context" toolset: get_team_members)
 *
 * @param params.org - Organization login name
 * @param params.team_slug - Team slug identifier
 * @param params.role - Filter by role (member, maintainer, all)
 * @param params.per_page - Results per page (max 100)
 * @param params.page - Page number
 */
export async function listTeamMembers(params: {
  org: string;
  team_slug: string;
  role?: 'member' | 'maintainer' | 'all';
  per_page?: number;
  page?: number;
}) {
  const { org, team_slug, role = 'all', per_page = 30, page = 1 } = params;

  validateUsername(org);

  logger.info(`[listTeamMembers] Fetching team members`, { org, team_slug, role, page });

  // Build query string
  const query = buildQueryString({
    role,
    per_page: Math.min(per_page, 100),
    page,
  });

  const members = await githubGet(`/orgs/${org}/teams/${team_slug}/members${query}`);

  // Format response
  const formattedMembers = members.map((member: any) => ({
    login: member.login,
    id: member.id,
    type: member.type,
    site_admin: member.site_admin,
    url: member.html_url,
    avatar_url: member.avatar_url,
  }));

  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(formattedMembers, null, 2),
      },
    ],
  };
}
