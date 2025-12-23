# GitHub MCP Server

Model Context Protocol (MCP) server for GitHub integration. Built for PETA Desk integration with STDIO transport.

## Features

- **39 tools** across 10 categories covering all GitHub development workflows:

  **Repository Management (6 tools)**:
  - `githubListRepositories` - List repositories for a user or authenticated user
  - `githubGetRepository` - Get detailed repository information
  - `githubCreateRepository` - Create a new repository
  - `githubForkRepository` - Fork an existing repository
  - `githubSearchRepositories` - Search repositories across GitHub
  - `githubGetFileContents` - Get file or directory contents from a repository

  **Issue Management (5 tools)**:
  - `githubListIssues` - List issues in a repository with filters
  - `githubGetIssue` - Get detailed issue information
  - `githubCreateIssue` - Create a new issue
  - `githubUpdateIssue` - Update an existing issue
  - `githubAddIssueComment` - Add a comment to an issue

  **Pull Request Management (5 tools)**:
  - `githubListPullRequests` - List pull requests in a repository
  - `githubGetPullRequest` - Get detailed pull request information
  - `githubCreatePullRequest` - Create a new pull request
  - `githubMergePullRequest` - Merge a pull request
  - `githubGetPullRequestDiff` - Get the diff of a pull request

  **User Operations (3 tools)**:
  - `githubGetAuthenticatedUser` - Get information about the authenticated user
  - `githubGetUser` - Get information about a specific user
  - `githubSearchUsers` - Search for users across GitHub

  **Organizations & Teams (5 tools)** - *Includes GitHub official "context" toolset*:
  - `githubListOrganizations` - List organizations for a user
  - `githubGetOrganization` - Get organization details
  - `githubListTeams` - List teams (context toolset)
  - `githubGetTeam` - Get team details
  - `githubListTeamMembers` - List team members (context toolset)

  **Commits (3 tools)**:
  - `githubListCommits` - List commits with filtering options
  - `githubGetCommit` - Get detailed commit information
  - `githubCompareCommits` - Compare two commits

  **Branches (4 tools)**:
  - `githubListBranches` - List all branches
  - `githubGetBranch` - Get branch details
  - `githubCreateBranch` - Create a new branch
  - `githubDeleteBranch` - Delete a branch

  **Pull Request Reviews (4 tools)**:
  - `githubListPullRequestReviews` - List all reviews for a PR
  - `githubCreateReview` - Create a review (approve/request changes/comment)
  - `githubListPullRequestFiles` - List files changed in a PR
  - `githubListPullRequestComments` - List all review comments

  **File Operations (2 tools)**:
  - `githubCreateOrUpdateFile` - Create or update a file in a repository
  - `githubDeleteFile` - Delete a file from a repository

  **Code Search (2 tools)**:
  - `githubSearchCode` - Search code across GitHub repositories
  - `githubSearchIssues` - Search issues and pull requests

- **STDIO Transport**: Direct process communication via stdin/stdout
- **Dynamic Token Updates**: Supports runtime token refresh without server restart
- **GitHub API v3**: Uses the latest stable GitHub REST API (2022-11-28)
- **Comprehensive Validation**: Input validation, branch name rules, file path security
- **Enhanced Error Handling**: Clear error messages with GitHub API error mapping

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull from GitHub Container Registry (GHCR)
docker pull ghcr.io/dunialabs/mcp-servers/github:latest

# Run with your GitHub OAuth access token
export accessToken='ghp_xxxxxxxxxxxx'
docker run -i --rm -e accessToken ghcr.io/dunialabs/mcp-servers/github:latest

# Or build locally
npm run build
docker build -t ghcr.io/dunialabs/mcp-servers/github:latest .
```

### Option 2: Direct Node.js

```bash
# Install and build
npm install
npm run build

# Run
export accessToken='ghp_xxxxxxxxxxxx'
node dist/stdio.js
```

### For PETA Core Integration

PETA Core will automatically:
1. Start this MCP server with STDIO transport (Docker or Node.js)
2. Provide GitHub OAuth access token via `accessToken` environment variable
3. Manage token refresh and server lifecycle

No manual configuration needed!

**Docker launchConfig:**
```json
{
  "command": "docker",
  "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/github:latest"],
  "env": {
    "accessToken": "ghp_xxxxxxxxxxxx"
  }
}
```

**Node.js launchConfig:**
```json
{
  "command": "node",
  "args": ["/path/to/mcp-github/dist/stdio.js"],
  "env": {
    "accessToken": "ghp_xxxxxxxxxxxx"
  }
}
```

## Authentication

The server reads the GitHub OAuth access token from the `accessToken` environment variable.

**Token Formats**:
- Personal Access Token (classic): `ghp_` prefix (40 characters)
- Fine-grained PAT: `github_pat_` prefix
- OAuth access token: `gho_` prefix
- GitHub App token: `ghs_` prefix

**Note**: Token refresh is handled by PETA Core. This server only needs the access token.

## Required GitHub OAuth Scopes

**Core Scopes (Recommended)**:
- `repo` - Full control of private repositories
  - Includes: `repo:status`, `repo_deployment`, `public_repo`, `repo:invite`, `security_events`
- `read:user` - Read user profile data
- `user:email` - Access user email addresses (optional)

**Additional Scopes (Optional)**:
- `write:repo_hook` - Write repository hooks (for webhook management)
- `read:org` - Read organization membership and teams (for organization operations)

## Environment Variables

### Required
- `accessToken` - GitHub OAuth access token or Personal Access Token (provided by peta-core or set manually)

### Optional - API Configuration
- `GITHUB_API_URL` - GitHub API base URL (default: `https://api.github.com`)
- `GITHUB_API_TIMEOUT` - API request timeout in milliseconds (default: `30000`)

### Optional - Proxy Configuration
- `HTTP_PROXY` / `http_proxy` - HTTP proxy URL
- `HTTPS_PROXY` / `https_proxy` - HTTPS proxy URL
- `NO_PROXY` / `no_proxy` - Hosts to bypass proxy

**Note**: Proxy is disabled by default in Docker images to prevent connection issues.

## Tool Examples

### Repository Management

#### List Repositories
```json
{
  "name": "githubListRepositories",
  "arguments": {
    "username": "octocat",
    "type": "owner",
    "sort": "updated",
    "per_page": 10
  }
}
```

#### Get Repository
```json
{
  "name": "githubGetRepository",
  "arguments": {
    "repo": "octocat/Hello-World"
  }
}
```

#### Create Repository
```json
{
  "name": "githubCreateRepository",
  "arguments": {
    "name": "my-new-repo",
    "description": "A new repository created via MCP",
    "private": false,
    "auto_init": true
  }
}
```

#### Fork Repository
```json
{
  "name": "githubForkRepository",
  "arguments": {
    "repo": "octocat/Hello-World"
  }
}
```

#### Search Repositories
```json
{
  "name": "githubSearchRepositories",
  "arguments": {
    "query": "machine learning language:python stars:>1000",
    "sort": "stars",
    "order": "desc",
    "per_page": 20
  }
}
```

#### Get File Contents
```json
{
  "name": "githubGetFileContents",
  "arguments": {
    "repo": "octocat/Hello-World",
    "path": "README.md",
    "ref": "main"
  }
}
```

### Issue Management

#### List Issues
```json
{
  "name": "githubListIssues",
  "arguments": {
    "repo": "octocat/Hello-World",
    "state": "open",
    "labels": ["bug", "high-priority"],
    "sort": "updated"
  }
}
```

#### Get Issue
```json
{
  "name": "githubGetIssue",
  "arguments": {
    "repo": "octocat/Hello-World",
    "issue_number": 42
  }
}
```

#### Create Issue
```json
{
  "name": "githubCreateIssue",
  "arguments": {
    "repo": "octocat/Hello-World",
    "title": "Bug: Application crashes on startup",
    "body": "## Description\nThe application crashes when...",
    "labels": ["bug"],
    "assignees": ["octocat"]
  }
}
```

#### Update Issue
```json
{
  "name": "githubUpdateIssue",
  "arguments": {
    "repo": "octocat/Hello-World",
    "issue_number": 42,
    "state": "closed",
    "body": "Fixed in #43"
  }
}
```

#### Add Issue Comment
```json
{
  "name": "githubAddIssueComment",
  "arguments": {
    "repo": "octocat/Hello-World",
    "issue_number": 42,
    "body": "Thanks for reporting! I'll look into this."
  }
}
```

### Pull Request Management

#### List Pull Requests
```json
{
  "name": "githubListPullRequests",
  "arguments": {
    "repo": "octocat/Hello-World",
    "state": "open",
    "sort": "updated",
    "direction": "desc"
  }
}
```

#### Get Pull Request
```json
{
  "name": "githubGetPullRequest",
  "arguments": {
    "repo": "octocat/Hello-World",
    "pull_number": 123
  }
}
```

#### Create Pull Request
```json
{
  "name": "githubCreatePullRequest",
  "arguments": {
    "repo": "octocat/Hello-World",
    "title": "Add new feature",
    "head": "feature-branch",
    "base": "main",
    "body": "## Changes\n- Added feature X\n- Fixed bug Y",
    "draft": false
  }
}
```

#### Merge Pull Request
```json
{
  "name": "githubMergePullRequest",
  "arguments": {
    "repo": "octocat/Hello-World",
    "pull_number": 123,
    "commit_title": "Merge pull request #123",
    "merge_method": "squash"
  }
}
```

#### Get Pull Request Diff
```json
{
  "name": "githubGetPullRequestDiff",
  "arguments": {
    "repo": "octocat/Hello-World",
    "pull_number": 123
  }
}
```

### User Operations

#### Get Authenticated User
```json
{
  "name": "githubGetAuthenticatedUser",
  "arguments": {}
}
```

#### Get User
```json
{
  "name": "githubGetUser",
  "arguments": {
    "username": "octocat"
  }
}
```

#### Search Users
```json
{
  "name": "githubSearchUsers",
  "arguments": {
    "query": "location:San Francisco followers:>100",
    "sort": "followers",
    "order": "desc"
  }
}
```

## Usage Scenarios

### Scenario 1: Repository Analysis
1. Use `githubGetAuthenticatedUser` to verify authentication
2. Use `githubListRepositories` to list user's repositories
3. Use `githubGetRepository` to get detailed information
4. Use `githubGetFileContents` to read specific files

### Scenario 2: Issue Management Workflow
1. Use `githubListIssues` to view open issues
2. Use `githubGetIssue` to read issue details
3. Use `githubAddIssueComment` to participate in discussions
4. Use `githubUpdateIssue` to update status or labels
5. Use `githubCreateIssue` to report new issues

### Scenario 3: Pull Request Review
1. Use `githubListPullRequests` to find PRs needing review
2. Use `githubGetPullRequest` to get PR details
3. Use `githubGetPullRequestDiff` to review changes
4. Use `githubAddIssueComment` to provide feedback (PRs are issues)
5. Use `githubMergePullRequest` to merge approved PRs

### Scenario 4: Code Search and Discovery
1. Use `githubSearchRepositories` to find relevant projects
2. Use `githubGetRepository` to check repository details
3. Use `githubForkRepository` to create your own copy
4. Use `githubGetFileContents` to explore code structure

## API Rate Limits

GitHub API has rate limits that vary by authentication method:

**Authenticated Requests**:
- OAuth tokens: 5,000 requests per hour
- Personal Access Tokens: 5,000 requests per hour
- GitHub Apps: 5,000 requests per hour (per installation)

**Unauthenticated Requests**:
- 60 requests per hour (not applicable for this server)

**Best Practices**:
- Use pagination to limit result sets (`per_page`, `page` parameters)
- Cache results when appropriate
- Monitor rate limit headers in responses
- Implement exponential backoff on rate limit errors

The server automatically logs rate limit information when responses are received.

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode with auto-reload
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

## Docker Build

```bash
# Local build (current platform)
./build-docker.sh

# Multi-platform build (amd64, arm64)
./build-docker.sh multi

# Build and push to GHCR
./build-docker.sh push

# Clean up builders
./build-docker.sh clean
```

## Security Features

- ✅ Input validation with Zod schemas
- ✅ Token format validation
- ✅ Repository name format validation (`owner/repo`)
- ✅ Username validation
- ✅ Secure logging with sensitive data redaction
- ✅ Error handling with MCP standard error codes
- ✅ Rate limit monitoring and logging
- ✅ Request timeout protection (30s default)

## Troubleshooting

### Authentication Errors

**Error**: `Authentication failed: Invalid or expired access token`

**Solutions**:
1. Verify `accessToken` environment variable is set correctly
2. Check token format matches one of the supported formats (ghp_, gho_, github_pat_, ghs_)
3. Ensure token has required scopes (repo, read:user)
4. Regenerate token if expired: https://github.com/settings/tokens

### Rate Limit Errors

**Error**: `GitHub API rate limit exceeded`

**Solutions**:
1. Wait for rate limit reset (check `X-RateLimit-Reset` header)
2. Use pagination to reduce request count
3. Implement caching in your application
4. Consider using GitHub Apps for higher rate limits

### Repository Not Found

**Error**: `Repository not found: owner/repo`

**Solutions**:
1. Verify repository name format is correct (`owner/repo`)
2. Check if repository is private and token has `repo` scope
3. Verify repository exists on GitHub
4. Check if you have access to the repository

### Network Errors

**Error**: `Request timeout` or connection errors

**Solutions**:
1. Check internet connectivity
2. Verify GitHub API is accessible (https://www.githubstatus.com/)
3. Configure proxy settings if behind corporate firewall
4. Increase timeout with `GITHUB_API_TIMEOUT` environment variable

## License

MIT
