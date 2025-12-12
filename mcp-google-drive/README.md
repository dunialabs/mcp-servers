# Google Drive MCP Server

Model Context Protocol (MCP) server for Google Drive integration. Built for PETA Desk integration with STDIO transport.

> **Version 1.1.2 - New Feature**: Added intelligent file change monitoring with adaptive polling intervals. **Enabled by default** for automatic resource list synchronization.

> **Version 1.1.0 - Breaking Change**: Tool names updated to camelCase format (e.g., `gdrive_search` → `gdriveSearch`) to follow MCP best practices for better LLM tokenization.

## Features

- **25 tools**:
  - `gdriveSearch` - File search with filters
  - `gdriveSearchAndRetrieve` - Search and retrieve file contents in one step
  - `gdriveGetTree` - Get folder hierarchy as a tree structure
  - `gdriveGetFileMetadata` - Get complete metadata for a specific file
  - `gdriveCreateFile` - Create new files or folders
  - `gdriveUpdateFile` - Update file content or metadata
  - `gdriveDeleteFile` - Delete files or move to trash
  - `gdriveCopyFile` - Copy files to same or different folder
  - `gdriveListTrash` - List all files in trash
  - `gdriveRestoreTrash` - Restore files from trash
  - `gdriveEmptyTrash` - Permanently delete all files in trash
  - `gdriveGetFolderStats` - Get folder statistics (size, file count, type breakdown)
  - `gdriveBatchMove` - Move multiple files to a folder
  - `gdriveBatchCopy` - Copy multiple files to a folder
  - `gdriveBatchDelete` - Delete multiple files at once
  - `gdriveShare` - Share files/folders with users or make public
  - `gdriveListPermissions` - List all permissions for a file/folder
  - `gdriveUpdatePermission` - Update existing permission roles
  - `gdriveRemovePermission` - Revoke access from users/groups
  - `gdriveUploadFile` - Upload files to Google Drive (base64 encoded)
  - `gdriveExportFile` - Export Google Workspace files to various formats
  - `gdriveListRevisions` - List all revisions (version history) of a file
  - `gdriveGetRevision` - Get details of a specific file revision
  - `gdriveUpdateRevision` - Mark revisions as "keep forever" or update properties
  - `gdriveDeleteRevision` - Delete a file revision (if not marked as "keep forever")

- **Resource URI Support**: Read files via `gdrive:///fileId` URIs

- **Intelligent Change Monitoring** (Enabled by default):
  - Detects file/folder additions, modifications, and deletions
  - Sends MCP `resources/list_changed` notifications to peta-core
  - Adaptive polling intervals (15s-5min) based on activity
  - Exponential backoff on errors
  - Optimized API quota consumption

- **STDIO Transport**: Direct process communication via stdin/stdout

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull from GitHub Container Registry (GHCR)
docker pull ghcr.io/dunialabs/mcp-servers/google-drive:latest

# Run with your Google OAuth access token
export accessToken='ya29.xxx...'
docker run -i --rm -e accessToken ghcr.io/dunialabs/mcp-servers/google-drive:latest

# Or build locally
npm run build
docker build -t ghcr.io/dunialabs/mcp-servers/google-drive:latest .
```

See [DOCKER.md](./DOCKER.md) for detailed Docker usage.

### Option 2: Direct Node.js

```bash
# Install and build
npm install
npm run build

# Run
export accessToken='ya29.xxx...'
node dist/stdio.js
```

### For PETA Core Integration

PETA Core will automatically:
1. Start this MCP server with STDIO transport (Docker or Node.js)
2. Provide Google OAuth access token via `accessToken` environment variable
3. Manage token refresh and server lifecycle

No manual configuration needed!

**Docker launchConfig:**
```json
{
  "command": "docker",
  "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/google-drive:latest"],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

**Node.js launchConfig:**
```json
{
  "command": "node",
  "args": ["/path/to/mcp-google-drive/dist/stdio.js"],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

## Authentication

The server reads the Google OAuth access token from the `accessToken` environment variable.

**Note**: Token refresh is handled by PETA Core. This server only needs the access token.

## Required Google OAuth Scopes

- `https://www.googleapis.com/auth/drive` - Full access to Google Drive

## Environment Variables

### Required
- `accessToken` - Google OAuth access token (provided by peta-core)

### Change Monitoring Configuration
Change monitoring is **enabled by default** with hardcoded configuration:
- Initial polling interval: 30 seconds
- Minimum interval (when active): 15 seconds
- Maximum interval (when idle): 5 minutes
- Idle threshold: 1 minute before increasing interval

No environment variables needed - monitoring starts automatically when the server initializes.

### Optional - Proxy Configuration
- `HTTP_PROXY` / `http_proxy` - HTTP proxy URL
- `HTTPS_PROXY` / `https_proxy` - HTTPS proxy URL
- `NO_PROXY` / `no_proxy` - Hosts to bypass proxy

**Note**: Proxy is disabled by default in Docker images to prevent connection issues.

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

## Security Features

- ✅ Input validation with Zod schemas
- ✅ Path traversal prevention
- ✅ Query injection prevention
- ✅ MIME type format validation
- ✅ File ID validation
- ✅ Secure logging with sensitive data redaction

## License

MIT
