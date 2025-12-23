/**
 * GitHub MCP Server
 * Registers tools and handles MCP protocol communication
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { logger } from './utils/logger.js';

// Import tools
import {
  listRepositories,
  getRepository,
  createRepository,
  forkRepository,
  searchRepositories,
  getFileContents,
} from './tools/repositories.js';
import {
  listIssues,
  getIssue,
  createIssue,
  updateIssue,
  addIssueComment,
} from './tools/issues.js';
import {
  listPullRequests,
  getPullRequest,
  createPullRequest,
  mergePullRequest,
  getPullRequestDiff,
} from './tools/pull-requests.js';
import { getAuthenticatedUser, getUser, searchUsers } from './tools/users.js';
import {
  listOrganizations,
  getOrganization,
  listTeams,
  getTeam,
  listTeamMembers,
} from './tools/organizations.js';
import { listCommits, getCommit, compareCommits } from './tools/commits.js';
import { listBranches, getBranch, createBranch, deleteBranch } from './tools/branches.js';
import {
  listPullRequestReviews,
  createReview,
  listPullRequestFiles,
  listPullRequestComments,
} from './tools/reviews.js';
import { createOrUpdateFile, deleteFile } from './tools/file-operations.js';
import { searchCode, searchIssues } from './tools/search.js';

/**
 * GitHub MCP Server Class
 */
export class GitHubMcpServer {
  private server: McpServer;

  constructor() {
    this.server = new McpServer({
      name: 'github',
      version: '1.0.0',
    });
  }

  /**
   * Initialize the server and register tools
   */
  async initialize() {
    logger.info('[Server] Initializing GitHub MCP Server');

    // Register token update notification handler
    // This allows Console to update the access token without restarting the server
    const TokenUpdateNotificationSchema = z.object({
      method: z.literal('notifications/token/update'),
      params: z.object({
        token: z.string(),
        timestamp: z.number().optional(),
      }).catchall(z.unknown()),
    }).catchall(z.unknown());

    this.server.server.setNotificationHandler(
      TokenUpdateNotificationSchema,
      async (notification) => {
        logger.info('[Token] Received token update notification');

        const { token: newToken, timestamp } = notification.params;

        // Validate token format
        if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
          logger.error('[Token] Invalid token received in notification');
          return;
        }

        // Update environment variable (used by getCurrentToken() in token.ts)
        process.env.accessToken = newToken;

        logger.info('[Token] Access token updated successfully', {
          timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
          tokenPrefix: newToken.substring(0, 10) + '...',
        });
      }
    );

    logger.info('[Server] Token update notification handler registered');

    // Register Repository Tools
    this.registerRepositoryTools();

    // Register Issue Tools
    this.registerIssueTools();

    // Register Pull Request Tools
    this.registerPullRequestTools();

    // Register User Tools
    this.registerUserTools();

    // Register Organization and Team Tools
    this.registerOrganizationTools();

    // Register Commit Tools
    this.registerCommitTools();

    // Register Branch Tools
    this.registerBranchTools();

    // Register PR Review Tools
    this.registerReviewTools();

    // Register File Operation Tools
    this.registerFileOperationTools();

    // Register Search Tools
    this.registerSearchTools();

    logger.info('[Server] All tools registered successfully');
  }

  /**
   * Register Repository Management Tools
   */
  private registerRepositoryTools() {
    // List Repositories
    this.server.registerTool(
      'githubListRepositories',
      {
        title: 'GitHub - List Repositories',
        description:
          'List repositories for a user or the authenticated user. Supports filtering and sorting.',
        inputSchema: {
          username: z.string().optional().describe('GitHub username (optional, defaults to authenticated user)'),
          type: z.enum(['all', 'owner', 'public', 'private', 'member']).optional().describe('Repository type filter'),
          sort: z.enum(['created', 'updated', 'pushed', 'full_name']).optional().describe('Sort field'),
          direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listRepositories(params)
    );

    // Get Repository
    this.server.registerTool(
      'githubGetRepository',
      {
        title: 'GitHub - Get Repository',
        description: 'Get detailed information about a specific repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
        },
      },
      async (params: any) => await getRepository(params)
    );

    // Create Repository
    this.server.registerTool(
      'githubCreateRepository',
      {
        title: 'GitHub - Create Repository',
        description: 'Create a new repository for the authenticated user.',
        inputSchema: {
          name: z.string().min(1).describe('Repository name (required)'),
          description: z.string().optional().describe('Repository description'),
          private: z.boolean().optional().describe('Whether the repository is private (default: false)'),
          auto_init: z.boolean().optional().describe('Initialize with README (default: false)'),
          gitignore_template: z.string().optional().describe('.gitignore template name'),
          license_template: z.string().optional().describe('License template name'),
        },
      },
      async (params: any) => await createRepository(params)
    );

    // Fork Repository
    this.server.registerTool(
      'githubForkRepository',
      {
        title: 'GitHub - Fork Repository',
        description: 'Create a fork of a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository to fork in "owner/repo" format (required)'),
          organization: z.string().optional().describe('Organization to fork to (optional)'),
        },
      },
      async (params: any) => await forkRepository(params)
    );

    // Search Repositories
    this.server.registerTool(
      'githubSearchRepositories',
      {
        title: 'GitHub - Search Repositories',
        description: 'Search for repositories across GitHub using a query.',
        inputSchema: {
          query: z.string().min(1).describe('Search query (required)'),
          sort: z.enum(['stars', 'forks', 'help-wanted-issues', 'updated']).optional().describe('Sort field'),
          order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await searchRepositories(params)
    );

    // Get File Contents
    this.server.registerTool(
      'githubGetFileContents',
      {
        title: 'GitHub - Get File Contents',
        description: 'Get the contents of a file or directory in a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          path: z.string().min(1).describe('File path in repository (required)'),
          ref: z.string().optional().describe('Branch, tag, or commit (optional)'),
        },
      },
      async (params: any) => await getFileContents(params)
    );
  }

  /**
   * Register Issue Management Tools
   */
  private registerIssueTools() {
    // List Issues
    this.server.registerTool(
      'githubListIssues',
      {
        title: 'GitHub - List Issues',
        description: 'List issues in a repository with filtering and sorting options.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          state: z.enum(['open', 'closed', 'all']).optional().describe('Issue state filter'),
          labels: z.array(z.string()).optional().describe('Filter by labels'),
          sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort field'),
          direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listIssues(params)
    );

    // Get Issue
    this.server.registerTool(
      'githubGetIssue',
      {
        title: 'GitHub - Get Issue',
        description: 'Get detailed information about a specific issue.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          issue_number: z.number().min(1).describe('Issue number (required)'),
        },
      },
      async (params: any) => await getIssue(params)
    );

    // Create Issue
    this.server.registerTool(
      'githubCreateIssue',
      {
        title: 'GitHub - Create Issue',
        description: 'Create a new issue in a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          title: z.string().min(1).describe('Issue title (required)'),
          body: z.string().optional().describe('Issue body/description'),
          labels: z.array(z.string()).optional().describe('Labels to add'),
          assignees: z.array(z.string()).optional().describe('Users to assign'),
        },
      },
      async (params: any) => await createIssue(params)
    );

    // Update Issue
    this.server.registerTool(
      'githubUpdateIssue',
      {
        title: 'GitHub - Update Issue',
        description: 'Update an existing issue.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          issue_number: z.number().min(1).describe('Issue number (required)'),
          title: z.string().optional().describe('New title'),
          body: z.string().optional().describe('New body/description'),
          state: z.enum(['open', 'closed']).optional().describe('New state'),
          labels: z.array(z.string()).optional().describe('Labels to set'),
        },
      },
      async (params: any) => await updateIssue(params)
    );

    // Add Issue Comment
    this.server.registerTool(
      'githubAddIssueComment',
      {
        title: 'GitHub - Add Issue Comment',
        description: 'Add a comment to an issue.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          issue_number: z.number().min(1).describe('Issue number (required)'),
          body: z.string().min(1).describe('Comment body (required)'),
        },
      },
      async (params: any) => await addIssueComment(params)
    );
  }

  /**
   * Register Pull Request Management Tools
   */
  private registerPullRequestTools() {
    // List Pull Requests
    this.server.registerTool(
      'githubListPullRequests',
      {
        title: 'GitHub - List Pull Requests',
        description: 'List pull requests in a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          state: z.enum(['open', 'closed', 'all']).optional().describe('PR state filter'),
          head: z.string().optional().describe('Filter by head user:ref (e.g., "user:branch")'),
          base: z.string().optional().describe('Filter by base branch'),
          sort: z.enum(['created', 'updated', 'popularity']).optional().describe('Sort field'),
          direction: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listPullRequests(params)
    );

    // Get Pull Request
    this.server.registerTool(
      'githubGetPullRequest',
      {
        title: 'GitHub - Get Pull Request',
        description: 'Get detailed information about a specific pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
        },
      },
      async (params: any) => await getPullRequest(params)
    );

    // Create Pull Request
    this.server.registerTool(
      'githubCreatePullRequest',
      {
        title: 'GitHub - Create Pull Request',
        description: 'Create a new pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          title: z.string().min(1).describe('PR title (required)'),
          head: z.string().min(1).describe('Head branch (required)'),
          base: z.string().min(1).describe('Base branch (required)'),
          body: z.string().optional().describe('PR description'),
          draft: z.boolean().optional().describe('Create as draft (default: false)'),
        },
      },
      async (params: any) => await createPullRequest(params)
    );

    // Merge Pull Request
    this.server.registerTool(
      'githubMergePullRequest',
      {
        title: 'GitHub - Merge Pull Request',
        description: 'Merge a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
          commit_title: z.string().optional().describe('Commit title'),
          commit_message: z.string().optional().describe('Commit message'),
          merge_method: z.enum(['merge', 'squash', 'rebase']).optional().describe('Merge method'),
        },
      },
      async (params: any) => await mergePullRequest(params)
    );

    // Get Pull Request Diff
    this.server.registerTool(
      'githubGetPullRequestDiff',
      {
        title: 'GitHub - Get Pull Request Diff',
        description: 'Get the diff of a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
        },
      },
      async (params: any) => await getPullRequestDiff(params)
    );
  }

  /**
   * Register User Tools
   */
  private registerUserTools() {
    // Get Authenticated User
    this.server.registerTool(
      'githubGetAuthenticatedUser',
      {
        title: 'GitHub - Get Authenticated User',
        description: 'Get information about the currently authenticated user.',
        inputSchema: {},
      },
      async () => await getAuthenticatedUser()
    );

    // Get User
    this.server.registerTool(
      'githubGetUser',
      {
        title: 'GitHub - Get User',
        description: 'Get information about a specific user by username.',
        inputSchema: {
          username: z.string().min(1).describe('GitHub username (required)'),
        },
      },
      async (params: any) => await getUser(params)
    );

    // Search Users
    this.server.registerTool(
      'githubSearchUsers',
      {
        title: 'GitHub - Search Users',
        description: 'Search for users across GitHub.',
        inputSchema: {
          query: z.string().min(1).describe('Search query (required)'),
          sort: z.enum(['followers', 'repositories', 'joined']).optional().describe('Sort field'),
          order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await searchUsers(params)
    );
  }

  /**
   * Register Organization and Team Tools
   */
  private registerOrganizationTools() {
    // List Organizations
    this.server.registerTool(
      'githubListOrganizations',
      {
        title: 'GitHub - List Organizations',
        description: 'List organizations for a user or the authenticated user.',
        inputSchema: {
          username: z.string().optional().describe('GitHub username (optional, defaults to authenticated user)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listOrganizations(params)
    );

    // Get Organization
    this.server.registerTool(
      'githubGetOrganization',
      {
        title: 'GitHub - Get Organization',
        description: 'Get detailed information about a specific organization.',
        inputSchema: {
          org: z.string().min(1).describe('Organization login name (required)'),
        },
      },
      async (params: any) => await getOrganization(params)
    );

    // List Teams (Context toolset: get_teams)
    this.server.registerTool(
      'githubListTeams',
      {
        title: 'GitHub - List Teams',
        description:
          'List teams for a user, organization, or the authenticated user. Part of GitHub MCP Server "context" toolset.',
        inputSchema: {
          org: z.string().optional().describe('Organization login name (for org teams)'),
          username: z.string().optional().describe('Username to list teams for (when org not specified)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listTeams(params)
    );

    // Get Team
    this.server.registerTool(
      'githubGetTeam',
      {
        title: 'GitHub - Get Team',
        description: 'Get detailed information about a specific team.',
        inputSchema: {
          org: z.string().min(1).describe('Organization login name (required)'),
          team_slug: z.string().min(1).describe('Team slug identifier (required)'),
        },
      },
      async (params: any) => await getTeam(params)
    );

    // List Team Members (Context toolset: get_team_members)
    this.server.registerTool(
      'githubListTeamMembers',
      {
        title: 'GitHub - List Team Members',
        description:
          'List members of a team. Part of GitHub MCP Server "context" toolset.',
        inputSchema: {
          org: z.string().min(1).describe('Organization login name (required)'),
          team_slug: z.string().min(1).describe('Team slug identifier (required)'),
          role: z.enum(['member', 'maintainer', 'all']).optional().describe('Filter by role (default: all)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listTeamMembers(params)
    );
  }

  /**
   * Register Commit Tools
   */
  private registerCommitTools() {
    // List Commits
    this.server.registerTool(
      'githubListCommits',
      {
        title: 'GitHub - List Commits',
        description: 'List commits in a repository with filtering options.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          sha: z.string().optional().describe('SHA or branch to start listing commits from'),
          path: z.string().optional().describe('Only commits containing this file path'),
          author: z.string().optional().describe('GitHub username or email address'),
          since: z.string().optional().describe('Only commits after this date (ISO 8601 format)'),
          until: z.string().optional().describe('Only commits before this date (ISO 8601 format)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listCommits(params)
    );

    // Get Commit
    this.server.registerTool(
      'githubGetCommit',
      {
        title: 'GitHub - Get Commit',
        description: 'Get detailed information about a specific commit.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          ref: z.string().min(1).describe('The commit reference - SHA, branch name, or tag name (required)'),
        },
      },
      async (params: any) => await getCommit(params)
    );

    // Compare Commits
    this.server.registerTool(
      'githubCompareCommits',
      {
        title: 'GitHub - Compare Commits',
        description: 'Compare two commits to see the differences between them.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          base: z.string().min(1).describe('The base branch, tag, or commit SHA (required)'),
          head: z.string().min(1).describe('The head branch, tag, or commit SHA (required)'),
        },
      },
      async (params: any) => await compareCommits(params)
    );
  }

  /**
   * Register Branch Tools
   */
  private registerBranchTools() {
    // List Branches
    this.server.registerTool(
      'githubListBranches',
      {
        title: 'GitHub - List Branches',
        description: 'List all branches in a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          protected: z.boolean().optional().describe('Filter by protected status'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listBranches(params)
    );

    // Get Branch
    this.server.registerTool(
      'githubGetBranch',
      {
        title: 'GitHub - Get Branch',
        description: 'Get detailed information about a specific branch.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          branch: z.string().min(1).describe('Branch name (required)'),
        },
      },
      async (params: any) => await getBranch(params)
    );

    // Create Branch
    this.server.registerTool(
      'githubCreateBranch',
      {
        title: 'GitHub - Create Branch',
        description: 'Create a new branch from an existing branch or commit.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          branch: z.string().min(1).describe('New branch name (required)'),
          from_branch: z.string().optional().describe('Source branch name (defaults to default branch)'),
          from_sha: z.string().optional().describe('Source commit SHA (alternative to from_branch)'),
        },
      },
      async (params: any) => await createBranch(params)
    );

    // Delete Branch
    this.server.registerTool(
      'githubDeleteBranch',
      {
        title: 'GitHub - Delete Branch',
        description: 'Delete a branch from the repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          branch: z.string().min(1).describe('Branch name to delete (required)'),
        },
      },
      async (params: any) => await deleteBranch(params)
    );
  }

  /**
   * Register PR Review Tools
   */
  private registerReviewTools() {
    // List PR Reviews
    this.server.registerTool(
      'githubListPullRequestReviews',
      {
        title: 'GitHub - List Pull Request Reviews',
        description: 'List all reviews for a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listPullRequestReviews(params)
    );

    // Create Review
    this.server.registerTool(
      'githubCreateReview',
      {
        title: 'GitHub - Create Pull Request Review',
        description: 'Create a review for a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
          body: z.string().optional().describe('Review comment body'),
          event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action (required)'),
          comments: z.array(z.object({
            path: z.string().describe('File path'),
            position: z.number().optional().describe('Deprecated: Position in diff'),
            body: z.string().describe('Comment text'),
            line: z.number().optional().describe('Line number in the file'),
            side: z.enum(['LEFT', 'RIGHT']).optional().describe('Side of the diff'),
            start_line: z.number().optional().describe('Start line for multi-line comment'),
            start_side: z.enum(['LEFT', 'RIGHT']).optional().describe('Start side for multi-line comment'),
          })).optional().describe('Line-specific comments'),
        },
      },
      async (params: any) => await createReview(params)
    );

    // List PR Files
    this.server.registerTool(
      'githubListPullRequestFiles',
      {
        title: 'GitHub - List Pull Request Files',
        description: 'List all files changed in a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listPullRequestFiles(params)
    );

    // List PR Comments
    this.server.registerTool(
      'githubListPullRequestComments',
      {
        title: 'GitHub - List Pull Request Comments',
        description: 'List all review comments on a pull request.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          pull_number: z.number().min(1).describe('Pull request number (required)'),
          sort: z.enum(['created', 'updated']).optional().describe('Sort field (default: created)'),
          direction: z.enum(['asc', 'desc']).optional().describe('Sort direction (default: asc)'),
          since: z.string().optional().describe('Only comments updated after this time (ISO 8601 format)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await listPullRequestComments(params)
    );
  }

  /**
   * Register File Operation Tools
   */
  private registerFileOperationTools() {
    // Create or Update File
    this.server.registerTool(
      'githubCreateOrUpdateFile',
      {
        title: 'GitHub - Create or Update File',
        description: 'Create a new file or update an existing file in a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          path: z.string().min(1).describe('File path in repository (required)'),
          message: z.string().min(1).describe('Commit message (required)'),
          content: z.string().min(1).describe('File content - plain text or base64 encoded (required)'),
          branch: z.string().optional().describe('Branch name (defaults to default branch)'),
          sha: z.string().optional().describe('Blob SHA of file being replaced (required for updates)'),
        },
      },
      async (params: any) => await createOrUpdateFile(params)
    );

    // Delete File
    this.server.registerTool(
      'githubDeleteFile',
      {
        title: 'GitHub - Delete File',
        description: 'Delete a file from a repository.',
        inputSchema: {
          repo: z.string().min(1).describe('Repository in "owner/repo" format (required)'),
          path: z.string().min(1).describe('File path in repository (required)'),
          message: z.string().min(1).describe('Commit message (required)'),
          sha: z.string().min(1).describe('Blob SHA of the file being removed (required)'),
          branch: z.string().optional().describe('Branch name (defaults to default branch)'),
        },
      },
      async (params: any) => await deleteFile(params)
    );
  }

  /**
   * Register Search Tools
   */
  private registerSearchTools() {
    // Search Code
    this.server.registerTool(
      'githubSearchCode',
      {
        title: 'GitHub - Search Code',
        description: 'Search for code across GitHub repositories.',
        inputSchema: {
          query: z.string().min(1).describe('Search query (required). Examples: "addClass in:file language:js repo:jquery/jquery"'),
          sort: z.enum(['indexed']).optional().describe('Sort field (only "indexed" available)'),
          order: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await searchCode(params)
    );

    // Search Issues
    this.server.registerTool(
      'githubSearchIssues',
      {
        title: 'GitHub - Search Issues and Pull Requests',
        description: 'Search for issues and pull requests across GitHub.',
        inputSchema: {
          query: z.string().min(1).describe('Search query (required). Examples: "is:open is:issue label:bug"'),
          sort: z.enum(['comments', 'reactions', 'reactions-+1', 'reactions--1', 'reactions-smile', 'reactions-thinking_face', 'reactions-heart', 'reactions-tada', 'interactions', 'created', 'updated']).optional().describe('Sort field'),
          order: z.enum(['asc', 'desc']).optional().describe('Sort order (default: desc)'),
          per_page: z.number().min(1).max(100).optional().describe('Results per page (max 100)'),
          page: z.number().min(1).optional().describe('Page number'),
        },
      },
      async (params: any) => await searchIssues(params)
    );
  }

  /**
   * Connect to a transport
   */
  async connect(transport: any) {
    await this.server.connect(transport);
  }

  /**
   * Get the MCP server instance
   */
  getServer() {
    return this.server;
  }
}
