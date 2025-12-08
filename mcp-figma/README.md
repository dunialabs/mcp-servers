# Figma MCP Server

Model Context Protocol (MCP) server for Figma integration. Built for PETA Desk integration with STDIO transport.

## Features

- **17 tools**:
  - `figmaTestConnection` - Test API connection and verify authentication
  - `figmaListFiles` - List files in a Figma project
  - `figmaGetFile` - Get full file document with nodes
  - `figmaGetNode` - Get specific nodes by ID
  - `figmaGetScreenshot` - Get rendered images from Figma files
  - `figmaGetMetadata` - Get simplified file metadata (supports JSON and lightweight XML formats)
  - `figmaGetFigJam` - Get FigJam diagram content in XML format with screenshots
  - `figmaGetVersions` - Get version history of a file
  - `figmaListComments` - List all comments in a file
  - `figmaCreateComment` - Create new comments on designs
  - `figmaReplyComment` - Reply to existing comments
  - `figmaGetDesignContext` - Get comprehensive design context (file + variables + components + styles) ⚠️
  - `figmaGetVariables` - Get design variables from a file ⚠️ Enterprise only
  - `figmaGetComponents` - Get components from a file
  - `figmaGetStyles` - Get styles from a file
  - `figmaListProjects` - List projects in a team
  - `figmaGetProject` - Get project details

> **⚠️ Enterprise Features**: `figmaGetVariables` and variable data in `figmaGetDesignContext` require Figma Enterprise plan and `file_variables:read` scope.

- Read access to file content, metadata, version history, comments, variables, components, and styles
- STDIO transport (stdin/stdout communication)
- Dynamic token updates without server restart

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull from Docker Hub
docker pull petaio/mcp-figma:latest

# Run with your Figma OAuth access token
export accessToken='figd_xxx...'
docker run -i --rm -e accessToken petaio/mcp-figma:latest

# Or build locally
npm run build
docker build -t petaio/mcp-figma:latest .
```

### Option 2: Direct Node.js

```bash
# Install and build
npm install
npm run build

# Run
export accessToken='figd_xxx...'
node dist/stdio.js
```

### For PETA Core Integration

PETA Core will automatically:
1. Start this MCP server with STDIO transport (Docker or Node.js)
2. Provide Figma OAuth access token via `accessToken` environment variable
3. Manage token refresh and server lifecycle

No manual configuration needed!

**Docker launchConfig:**
```json
{
  "command": "docker",
  "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "petaio/mcp-figma:latest"],
  "env": {
    "accessToken": "figd_xxx..."
  }
}
```

**Node.js launchConfig:**
```json
{
  "command": "node",
  "args": ["/path/to/mcp-figma/dist/stdio.js"],
  "env": {
    "accessToken": "figd_xxx..."
  }
}
```

## Authentication

The server reads the Figma OAuth access token from the `accessToken` environment variable.

**Token Format**: `figd_xxx...`

**Note**: Token refresh is handled by PETA Core. This server only needs the access token.

## Required Figma OAuth Scopes

**Core Scopes (Required)**:
- `current_user:read` - Read current user information
- `file_content:read` - Read file content, structure, and images
- `file_metadata:read` - Read file metadata
- `file_versions:read` - Read version history
- `file_comments:read` - Read comments
- `file_comments:write` - Create and reply to comments
- `library_content:read` - Read library components and styles
- `projects:read` - Read project information

**Optional Scopes (Enterprise Features)**:
- `file_variables:read` - Read design variables (Enterprise only, used by `figmaGetVariables`)
- `library_analytics:read` - Read design system analytics (Enterprise only, if needed)

## Environment Variables

### Required
- `accessToken` - Figma OAuth access token (provided by peta-core)

### Optional - Proxy Configuration
- `HTTP_PROXY` / `http_proxy` - HTTP proxy URL
- `HTTPS_PROXY` / `https_proxy` - HTTPS proxy URL
- `NO_PROXY` / `no_proxy` - Hosts to bypass proxy

**Note**: Proxy is disabled by default in Docker images to prevent connection issues.

## API Limitations

Figma REST API has the following known limitations:

1. **No Team/Project Discovery**
   - API does not provide endpoints to list all teams or projects for a user
   - You must manually extract `team_id` and `project_id` from Figma URLs
   - Example URL format: `https://www.figma.com/files/team/{TEAM_ID}/project/{PROJECT_ID}`

2. **Unstable Node IDs**
   - Node IDs may change when files are modified
   - Always use `figmaGetFile` to discover current node IDs
   - Do not hardcode node IDs in your application

3. **Rate Limiting**
   - Personal Access Tokens: Rate limited per user
   - OAuth Apps: Global rate limits apply
   - Best practices: Use batch operations and implement caching

4. **Enterprise Features**
   - Variables API requires Figma Enterprise plan and `file_variables:read` scope
   - Design system analytics requires Enterprise plan

## Usage Scenarios

### Scenario 1: Design to Code Workflow
1. Use `figmaTestConnection` to verify authentication
2. Use `figmaGetMetadata` to check file basic information
3. Use `figmaGetFile` with `depth=1` to get file structure (CANVAS/PAGE nodes)
4. Use `figmaGetNode` with `depth=2-3` to get specific component details
5. Use `figmaGetScreenshot` with `scale=2` to export design images
6. Use `figmaGetComponents` to extract component library
7. Use `figmaGetStyles` to extract design tokens and styles

### Scenario 2: Design Review
1. Use `figmaListComments` to view existing comments
2. Use `figmaCreateComment` to add feedback on designs
3. Use `figmaReplyComment` to participate in discussions

### Scenario 3: Design System Synchronization
1. Use `figmaGetDesignContext` to get complete design system in one call
2. Use `figmaGetVariables` to extract design tokens (Enterprise only)
3. Use `figmaGetComponents` to sync component library
4. Use `figmaGetStyles` to sync design styles

## Tool Examples

### Test Connection
```json
{
  "name": "figmaTestConnection",
  "arguments": {}
}
```

### List Files in a Project
```json
{
  "name": "figmaListFiles",
  "arguments": {
    "projectId": "123456789"
  }
}
```

### Get File Content
```json
{
  "name": "figmaGetFile",
  "arguments": {
    "fileKey": "abc123def456",
    "depth": 2
  }
}
```

### Get Specific Nodes
```json
{
  "name": "figmaGetNode",
  "arguments": {
    "fileKey": "abc123def456",
    "nodeIds": ["1:2", "3:4"]
  }
}
```

### Get Screenshot
```json
{
  "name": "figmaGetScreenshot",
  "arguments": {
    "fileKey": "abc123def456",
    "nodeIds": ["1:2", "3:4"],
    "format": "png",
    "scale": 2
  }
}
```

### Get File Metadata

**Default JSON format:**
```json
{
  "name": "figmaGetMetadata",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

**Lightweight XML format:**
```json
{
  "name": "figmaGetMetadata",
  "arguments": {
    "fileKey": "abc123def456",
    "lightweight": true,
    "format": "xml"
  }
}
```

### Get FigJam Diagram

**Get all nodes with screenshots:**
```json
{
  "name": "figmaGetFigJam",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

**Get specific nodes:**
```json
{
  "name": "figmaGetFigJam",
  "arguments": {
    "fileKey": "abc123def456",
    "nodeIds": ["1:2", "3:4"],
    "includeScreenshots": true,
    "scale": 2
  }
}
```

### Get Version History
```json
{
  "name": "figmaGetVersions",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### List Comments
```json
{
  "name": "figmaListComments",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### Create Comment

**Canvas coordinates example:**
```json
{
  "name": "figmaCreateComment",
  "arguments": {
    "fileKey": "abc123def456",
    "message": "Great design! Can we adjust the spacing here?",
    "clientMeta": {
      "x": 100,
      "y": 200
    }
  }
}
```

**Node-relative example:**
```json
{
  "name": "figmaCreateComment",
  "arguments": {
    "fileKey": "abc123def456",
    "message": "Please review this component",
    "clientMeta": {
      "node_id": "1:2",
      "node_offset": {
        "x": 10,
        "y": 20
      }
    }
  }
}
```

### Reply to Comment
```json
{
  "name": "figmaReplyComment",
  "arguments": {
    "fileKey": "abc123def456",
    "commentId": "789",
    "message": "Good point, I'll update it."
  }
}
```

### Get Design Context
```json
{
  "name": "figmaGetDesignContext",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### Get Variables
```json
{
  "name": "figmaGetVariables",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### Get Components
```json
{
  "name": "figmaGetComponents",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### Get Styles
```json
{
  "name": "figmaGetStyles",
  "arguments": {
    "fileKey": "abc123def456"
  }
}
```

### List Projects
```json
{
  "name": "figmaListProjects",
  "arguments": {
    "teamId": "987654321"
  }
}
```

### Get Project Details
```json
{
  "name": "figmaGetProject",
  "arguments": {
    "projectId": "123456789"
  }
}
```

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

# Build and push to Docker Hub
./build-docker.sh push

# Clean up builders
./build-docker.sh clean
```

## Security Features

- Input validation with Zod schemas
- Secure logging with sensitive data redaction
- Error handling with MCP standard error codes
- Token-based authentication

## License

MIT
