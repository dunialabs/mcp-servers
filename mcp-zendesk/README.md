# Zendesk MCP Server

A Model Context Protocol (MCP) server for Zendesk integration, enabling AI assistants to manage tickets, users, organizations, and more.

## Features

- **18 Management Tools**: Complete ticket, user, and organization management
- **Hybrid Authentication**: Supports both OAuth tokens (production) and API tokens (development)
- **Token Refresh**: Automatic OAuth token refresh via MCP notifications
- **Docker Support**: Multi-platform Docker images (linux/amd64, linux/arm64)
- **Type-Safe**: Full TypeScript implementation with Zod schemas
- **Error Handling**: Comprehensive error handling with proper HTTP status code mapping

## Tools

### Ticket Management (8 tools)

| Tool | Description |
|------|-------------|
| `zendesk_list_tickets` | List recent tickets (use search for filtering) |
| `zendesk_get_ticket` | Get details of a specific ticket by ID |
| `zendesk_create_ticket` | Create a new ticket with subject and description |
| `zendesk_update_ticket` | Update ticket status, priority, assignment, etc. |
| `zendesk_delete_ticket` | Delete a ticket permanently |
| `zendesk_get_ticket_comments` | Get all comments on a ticket |
| `zendesk_add_ticket_comment` | Add a public or private comment to a ticket |
| `zendesk_search_tickets` | Search tickets by status, priority, or custom query |

> **Note**: To filter tickets by status or priority, use `zendesk_search_tickets` with queries like `"status:open priority:high"`.

### User Management (5 tools)

| Tool | Description |
|------|-------------|
| `zendesk_list_users` | List users with optional role filter (end-user, agent, admin) |
| `zendesk_get_user` | Get details of a specific user by ID |
| `zendesk_create_user` | Create a new user with name, email, and role |
| `zendesk_update_user` | Update user information (name, email, role, etc.) |
| `zendesk_delete_user` | Delete a user permanently |

### Organization Management (5 tools)

| Tool | Description |
|------|-------------|
| `zendesk_list_organizations` | List all organizations |
| `zendesk_get_organization` | Get details of a specific organization by ID |
| `zendesk_create_organization` | Create a new organization with name and domains |
| `zendesk_update_organization` | Update organization information |
| `zendesk_delete_organization` | Delete an organization permanently |

## Authentication

mcp-zendesk supports two authentication methods:

### Option 1: API Token (Development) ⭐ Recommended

**Use when:** Local development and testing

**Setup (30 seconds):**

1. Visit your Zendesk admin panel: `https://{subdomain}.zendesk.com/admin/apps-integrations/apis/zendesk-api`
2. Click "Add API Token"
3. Copy the token
4. Configure `.env`:

```bash
zendeskSubdomain=mycompany
zendeskEmail=admin@mycompany.com
zendeskApiToken=your_api_token_here
```

**Advantages:**
- ✅ No expiration (permanent)
- ✅ Quick setup
- ✅ No OAuth configuration needed

### Option 2: OAuth Token (Production)

**Use when:** Running in Console/peta-core production environment

Console automatically provides OAuth tokens and handles refresh.

```json
{
  "env": {
    "zendeskSubdomain": "mycompany",
    "accessToken": "oauth_token_from_console"
  }
}
```

## Quick Start

### Local Development

```bash
# 1. Clone and install
cd mcp-zendesk
npm install

# 2. Get API Token from Zendesk (30 seconds)
# Visit: https://mycompany.zendesk.com/admin/apps-integrations/apis/zendesk-api
# Click "Add API Token" and copy it

# 3. Configure
cp .env.example .env
# Edit .env with your subdomain, email, and API token

# 4. Build and run
npm run build
npm start
```

### Docker

```bash
# Build
docker build -t mcp-zendesk .

# Run with API Token
docker run -i --rm \
  -e zendeskSubdomain=mycompany \
  -e zendeskEmail=admin@mycompany.com \
  -e zendeskApiToken=your_token \
  mcp-zendesk

# Run with OAuth Token
docker run -i --rm \
  -e zendeskSubdomain=mycompany \
  -e accessToken=oauth_token \
  mcp-zendesk
```

## Using with Claude Desktop

Add to your Claude Desktop configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Option 1: Direct Node.js (Development)

```json
{
  "mcpServers": {
    "zendesk": {
      "command": "node",
      "args": ["/path/to/mcp-zendesk/dist/stdio.js"],
      "env": {
        "zendeskSubdomain": "mycompany",
        "zendeskEmail": "admin@mycompany.com",
        "zendeskApiToken": "your_api_token"
      }
    }
  }
}
```

### Option 2: Docker (Production)

```json
{
  "mcpServers": {
    "zendesk": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "zendeskSubdomain",
        "-e", "zendeskEmail",
        "-e", "zendeskApiToken",
        "ghcr.io/dunialabs/mcp-servers/zendesk:latest"
      ],
      "env": {
        "zendeskSubdomain": "mycompany",
        "zendeskEmail": "admin@mycompany.com",
        "zendeskApiToken": "your_api_token"
      }
    }
  }
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `zendeskSubdomain` | Yes | Your Zendesk subdomain (e.g., "mycompany" for mycompany.zendesk.com) |
| `zendeskEmail` | For API Token | Your Zendesk email |
| `zendeskApiToken` | For API Token | Your Zendesk API token |
| `accessToken` | For OAuth | OAuth access token (provided by Console) |
| `zendeskApiTimeout` | No | API request timeout in ms (default: 30000) |

## Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Build
npm run build

# Lint
npm run lint
npm run lint:fix

# Format
npm run format
npm run format:check

# Type check
npm run type-check
```

## Docker Build

```bash
# Build for local platform
./build-docker.sh

# Build for multiple platforms
./build-docker.sh multi

# Push to registry
./build-docker.sh push

# Clean build cache
./build-docker.sh clean
```

## Project Structure

```
mcp-zendesk/
├── src/
│   ├── auth/
│   │   └── token.ts          # Hybrid authentication (OAuth + API Token)
│   ├── tools/
│   │   └── tickets.ts        # Ticket management tools
│   ├── utils/
│   │   ├── zendesk-api.ts    # Zendesk API client
│   │   ├── errors.ts         # Error handling
│   │   └── logger.ts         # Logging utilities
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── server.ts             # MCP Server implementation
│   └── stdio.ts              # STDIO entry point
├── .env.example              # Environment variables template
├── Dockerfile                # Multi-stage Docker build
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT License - see [LICENSE](LICENSE) for details

Copyright (c) 2025 PETA Team / Dunia Labs, Inc.

## Support

For issues or questions, please open an issue on GitHub.

## Links

- [Zendesk API Documentation](https://developer.zendesk.com/api-reference/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
