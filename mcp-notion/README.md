# Notion MCP Server

Model Context Protocol (MCP) server for Notion integration. Built for PETA Desk integration with STDIO transport.

> **Version 1.1.0 - Breaking Change**: Tool names updated to camelCase format (e.g., `notion_get_page` → `notionGetPage`) to follow MCP best practices for better LLM tokenization.

## Features

- **16 tools**:
  - **Pages**:
    - `notionGetPage` - Get page by ID with full metadata
    - `notionCreatePage` - Create new pages
    - `notionUpdatePage` - Update page properties
    - `notionGetPageProperties` - Get page properties only
  - **Databases**:
    - `notionGetDatabase` - Get database metadata and schema
    - `notionQueryDatabase` - Query database with filters and sorting
    - `notionCreateDatabase` - Create new databases
    - `notionUpdateDatabase` - Update database properties
  - **Blocks (Content)**:
    - `notionGetBlockChildren` - Get page/block content
    - `notionAppendBlocks` - Add content to pages
    - `notionGetBlock` - Get specific block
    - `notionUpdateBlock` - Update block content
    - `notionDeleteBlock` - Delete blocks
  - **Comments**:
    - `notionCreateComment` - Create comments on pages
    - `notionGetComments` - Get comments from pages/blocks
  - **Search**:
    - `notionSearch` - Search across workspace

- **STDIO Transport**: Direct process communication via stdin/stdout
- **Token Management**: Supports both Internal Integration tokens and OAuth access tokens

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull from Docker Hub
docker pull petaio/mcp-notion:latest

# Run with your Notion token
export notionToken='ntn_xxx...'
docker run -i --rm -e notionToken petaio/mcp-notion:latest

# Or build locally
npm run build
docker build -t petaio/mcp-notion:latest .
```

### Option 2: Direct Node.js

```bash
# Install and build
npm install
npm run build

# Run
export notionToken='ntn_xxx...'
node dist/stdio.js
```

### For PETA Core Integration

PETA Core will automatically:
1. Start this MCP server with STDIO transport (Docker or Node.js)
2. Provide Notion token via `notionToken` environment variable
3. Manage token and server lifecycle

No manual configuration needed!

**Docker launchConfig:**
```json
{
  "command": "docker",
  "args": ["run", "--pull=always", "-i", "--rm", "-e", "notionToken", "petaio/mcp-notion:latest"],
  "env": {
    "notionToken": "ntn_xxx..."
  }
}
```

**Node.js launchConfig:**
```json
{
  "command": "node",
  "args": ["/path/to/mcp-notion/dist/stdio.js"],
  "env": {
    "notionToken": "ntn_xxx..."
  }
}
```

## Authentication

The server supports two authentication modes:

### 1. Standalone Mode (Internal Integration)
Users create a Notion Internal Integration and provide the token:
- Visit: https://www.notion.so/my-integrations
- Create new integration
- Copy the "Internal Integration Token" (typically starts with `ntn_` or `secret_`)
- Share pages/databases with the integration

### 2. PETA Console Mode (OAuth)
PETA Console handles OAuth flow and passes the access token:
- User authorizes via Notion OAuth
- Platform receives access token
- Token passed to MCP server via `notionToken` environment variable

**Note**: Token refresh is handled by PETA Core when using OAuth mode.

## Claude Desktop Configuration (Standalone Mode)

To use this server with Claude Desktop in standalone mode:

### Step 1: Get Notion Integration Token

1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the integration name (e.g., "Claude MCP")
4. Select the workspace to associate with
5. Click **"Submit"**
6. Copy the **"Internal Integration Token"** (typically starts with `ntn_` or `secret_`)

### Step 2: Share Pages with Integration

In Notion:
1. Open the page or database you want to access
2. Click the **"..."** menu in the top right
3. Scroll to **"Connections"**
4. Click **"Add connections"**
5. Select your integration

**Important**: The integration can only access pages/databases you explicitly share with it.

### Step 3: Configure Claude Desktop

Edit the Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

#### Option A: Using Docker (Recommended)

```json
{
  "mcpServers": {
    "notion": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "notionToken",
        "petaio/mcp-notion:latest"
      ],
      "env": {
        "notionToken": "YOUR_NOTION_TOKEN"
      }
    }
  }
}
```

**Advantages of Docker**:
- ✅ No need to install Node.js
- ✅ No need to clone/build the project
- ✅ Automatic updates with `docker pull`
- ✅ Isolated environment
- ✅ Works on all platforms (amd64, arm64)

**Replace**: `YOUR_NOTION_TOKEN` with your Notion Integration Token from Step 1

#### Option B: Using Node.js Directly

```json
{
  "mcpServers": {
    "notion": {
      "command": "node",
      "args": [
        "/ABSOLUTE/PATH/TO/mcp-notion/dist/stdio.js"
      ],
      "env": {
        "notionToken": "YOUR_NOTION_TOKEN"
      }
    }
  }
}
```

**Replace**:
- `/ABSOLUTE/PATH/TO/mcp-notion` with the actual absolute path to your mcp-notion directory
- `secret_YOUR_TOKEN_HERE` with your Notion Integration Token from Step 1

**Prerequisites for Option B**:
- Node.js 18+ installed
- Project cloned and built (`npm install && npm run build`)

### Step 4: Restart Claude Desktop

1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. Look for the 🔌 icon indicating MCP servers are connected
4. You can now use Notion tools in your conversations!

### Example Usage

Once configured, you can ask Claude:
- "Search my Notion workspace for pages about project planning"
- "Get the content of page ID xxx..."
- "Create a new page in my Notion workspace"
- "Query the database xxx with filter ..."

## Required Notion Capabilities

The integration token needs access to:
- Read content
- Update content
- Insert content
- Read comments (optional)
- Insert comments (optional)

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

## Tool Details

### Page Tools
- **notionGetPage**: Retrieve full page object with properties
- **notionCreatePage**: Create pages as children of other pages or as database entries
- **notionUpdatePage**: Modify page properties or archive pages
- **notionGetPage_properties**: Get only page properties (faster than full page)

### Database Tools
- **notionGetDatabase**: Get database schema and configuration
- **notionQueryDatabase**: Query database with filters, sorts, and pagination
- **notionCreateDatabase**: Create new databases in pages
- **notionUpdateDatabase**: Modify database schema and properties

### Block Tools
- **notionGetBlockChildren**: Retrieve page content as blocks
- **notionAppendBlocks**: Add new content blocks to pages
- **notionGetBlock**: Get specific block details
- **notionUpdateBlock**: Modify block content
- **notionDeleteBlock**: Archive/delete blocks

### Comment Tools
- **notionCreateComment**: Create comments on pages or reply to discussions
- **notionGetComments**: Retrieve all comments from a page or block with discussion threads

### Search Tool
- **notionSearch**: Search across all accessible pages and databases
  - Filter by type (page/database)
  - Sort by last edited time
  - Full-text search

## Security Features

- ✅ Input validation with Zod schemas following Notion API limits
- ✅ Notion UUID format validation (32-36 characters)
- ✅ Token format validation (length and character checks)
- ✅ Secure logging with sensitive data redaction (tokens, emails, paths)
- ✅ Error handling with standardized MCP errors
- ✅ Docker runs as non-root user (nodejs:1001)
- ✅ Automatic retry with exponential backoff for transient errors
- ✅ Zero npm dependency vulnerabilities

## Security Considerations

### Token Management

**Token Storage**:
- Tokens are managed via environment variables and runtime updates
- In STDIO mode, communication is local (process-to-process) and inherently secure
- All token updates are logged for audit purposes (with redacted token values)

**Token Types**:
- **Internal Integration tokens** (`secret_xxx`): Do not expire unless manually revoked
- **OAuth access tokens**: Managed by PETA Console, automatically refreshed when needed

**Token Update Mechanism**:
The server accepts token updates via MCP notifications (`notifications/token/update`). This enables:
- Seamless OAuth token refresh without server restart
- Manual token rotation for security best practices
- Zero-downtime token updates in production

**Security Model**:
- STDIO transport ensures only local processes can communicate with the server
- Token updates are validated for format before acceptance
- All operations are logged with timestamp and redacted credentials

### Production Deployment

For production environments, we recommend:

**Container Security**:
- ✅ Use the official Docker image (runs as non-root user)
- ✅ Keep images updated for security patches
- ✅ Use Docker secrets for token storage instead of environment variables when possible
- ✅ Limit container capabilities and network access

**Token Security**:
- 🔄 Rotate Internal Integration tokens every 90 days
- 🔐 Never commit tokens to version control (use `.env` files with `.gitignore`)
- 📝 Monitor logs for unusual token update patterns or API errors
- 🔒 Use workspace-level token expiration policies if available (Notion Enterprise)

**Network Security** (if exposing over network):
- 🔒 Use TLS/SSL encryption for all communications
- 🛡️ Implement firewall rules to restrict access
- 🌐 Consider VPN or private networks for sensitive deployments
- 📊 Set up monitoring and alerting for suspicious activities

**Access Control**:
- Ensure only trusted processes can send notifications to the MCP server
- Run MCP server in isolated containers or sandboxed environments
- Follow principle of least privilege for Notion integration capabilities
- Only share necessary pages/databases with the integration

### Logging and Monitoring

The server provides comprehensive logging with security in mind:

**Redacted Information**:
- ✅ Tokens (replaced with prefix + `...`)
- ✅ Email addresses (masked)
- ✅ Authorization headers (fully redacted)
- ✅ Sensitive paths in stack traces (sanitized to `/app`)

**Logged Events**:
- All API operations (with timestamps and operation types)
- Token updates (with sanitized token prefix)
- Retry attempts and failures
- Error conditions with context

**Security Recommendations**:
- Review logs regularly for authentication failures
- Monitor for unusual token update frequencies
- Watch for repeated API errors that might indicate attacks
- Set up alerts for critical error conditions

### Compliance and Best Practices

**Data Handling**:
- The server does not store any Notion data persistently
- All data passes through in-memory only
- Logging is configurable (set `NODE_ENV=production` to reduce verbosity)

**API Rate Limiting**:
- Notion API enforces rate limits (3 requests/second average)
- The server automatically retries with exponential backoff for rate limit errors
- Consider implementing application-level rate limiting for high-volume use cases

**Notion API Version**:
- Currently using Notion API version `2022-06-28` (stable, widely supported)
- See [Notion API changelog](https://developers.notion.com/page/changelog) for updates
- Upgrading to newer versions may require code changes

### Reporting Security Issues

If you discover a security vulnerability, please email security@peta.io with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fixes (if any)

Please do not open public issues for security vulnerabilities.

## License

MIT
