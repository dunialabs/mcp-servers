# Peta MCP Servers

A collection of MCP (Model Context Protocol) servers for Peta Core, created by Dunia Labs

These are MCP servers optimized for efficient and effective use with Peta Core. They can be connected to Peta Core and configured directly for immediate use, or run independently without Peta.

When used with Peta Core, you get:

- Secure credential management — API credentials and sensitive information are stored in the vault, never exposed externally, and accessed only when needed
- Multi-tenant support — Serve multiple users or organizations from a single deployment
- Granular permissions — Assign different access levels and permissions to different API keys
- Human-in-the-loop approval — Require explicit human approval for risky or sensitive operations before execution


## Available Servers

### 1. MCP Server Template
**Directory:** `mcp-server-template/`

A template for creating new MCP servers. Use this as a starting point for building your own MCP integrations.

**Features:**

- TypeScript-based structure
- Testing infrastructure
- Best practices and guidelines
- Documentation and examples

[View Documentation →](./mcp-server-template/README.md)

---

### 2. MCP Google Drive Server
**Directory:** `mcp-google-drive/`

An MCP server that provides integration with Google Drive, enabling AI assistants to interact with your Google Drive files and folders.

**Features:**

- File and folder management
- Search capabilities
- File version history
- Docker support
- Real-time token updates

[View Documentation →](./mcp-google-drive/README.md)

---

### 3. MCP PostgreSQL Server
**Directory:** `mcp-postgres/`

An MCP server for PostgreSQL database integration, allowing AI assistants to query and interact with PostgreSQL databases safely.

**Features:**

- Read-only and write operations
- Schema inspection
- Secure query execution
- Docker support
- Connection pooling

[View Documentation →](./mcp-postgres/README.md)

---

### 4. MCP Notion Server
**Directory:** `mcp-notion/`

An MCP server for Notion integration, enabling AI assistants to interact with Notion pages, databases, blocks, and users.

**Features:**

- 16 tools for Notion operations
- Page management (create, read, update, delete, search)
- Database operations (query, create, manage)
- Block management (append, read, update, delete)
- User management
- Property management
- STDIO transport
- Docker support (amd64/arm64)
- Token-based authentication

[View Documentation →](./mcp-notion/README.md)

---

### 5. MCP Google Calendar Server
**Directory:** `mcp-google-calendar/`

An MCP server for Google Calendar integration, enabling AI assistants to manage calendars and events.

**Features:**

- 10 tools for calendar and event management
- Calendar management (list, create, delete)
- Event operations (create, read, update, delete, search)
- Free/busy queries and event creation
- STDIO transport
- Docker support (amd64/arm64)
- Token-based authentication
- Runtime token refresh

[View Documentation →](./mcp-google-calendar/README.md)

---

### 6. MCP Figma Server
**Directory:** `mcp-figma/`

An MCP server for Figma integration, enabling AI assistants to interact with Figma files, designs, and collaboration features.

**Features:**

- 17 tools for Figma operations
- File management (list, read, metadata, screenshots)
- Design system access (components, styles, variables)
- FigJam support (diagram content and screenshots in XML)
- Collaboration (comments, replies, version history)
- STDIO transport
- Docker support (amd64/arm64)
- Token-based authentication

[View Documentation →](./mcp-figma/README.md)

---

### 7. MCP REST Gateway
**Directory:** `mcp-rest-gateway/`

A configuration-driven gateway that converts any REST API into MCP tools, enabling AI assistants to interact with RESTful services without writing code.

**Features:**

- Convert REST APIs to MCP tools via JSON configuration
- Authentication types: bearer, query_param, header, basic, none
- Parameter mapping to REST endpoints (path, query, body, header)
- JSONPath support for response transformation
- Environment variable substitution
- OpenAPI generator (auto-generate config from OpenAPI/Swagger)
- STDIO transport
- Docker support (amd64/arm64)
- Compatible with Peta Core

[View Documentation →](./mcp-rest-gateway/README.md)

---

## Repository Structure

```
peta-mcp-servers/
├── mcp-server-template/     # Template for new MCP servers
├── mcp-google-drive/        # Google Drive integration
├── mcp-postgres/            # PostgreSQL database integration
├── mcp-notion/              # Notion workspace integration
├── mcp-google-calendar/     # Google Calendar integration
├── mcp-figma/               # Figma design integration
├── mcp-rest-gateway/        # REST API to MCP gateway
└── README.md                # This file
```

## Getting Started

Each MCP server has its own documentation and setup instructions. Navigate to the specific server directory and read its README for detailed information.

### General Prerequisites

Most servers in this repository require:
- Node.js 18+ or compatible runtime
- npm or yarn package manager
- Appropriate API credentials or access tokens for the service being integrated

### Installation

Each server can be installed and run independently:

```bash
# Navigate to the specific server directory
cd mcp-google-drive

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Build the server
npm run build

# Run the server (if applicable)
npm start
```

## Using with Claude Desktop

To use these MCP servers with Claude Desktop, add them to your Claude configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Option 1: Docker (Recommended)

Docker configuration provides isolation and easier deployment:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "docker",
      "args": [
        "run",
        "--pull=always",
        "-i",
        "--rm",
        "-e",
        "POSTGRES_URL",
        "-e",
        "ACCESS_MODE",
        "petaio/mcp-postgres:latest"
      ],
      "env": {
        "POSTGRES_URL": "postgresql://user:password@localhost:5432/dbname",
        "ACCESS_MODE": "readonly"
      }
    },
    "google-drive": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "petaio/mcp-google-drive:latest"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "notion": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "notionToken", "petaio/mcp-notion:latest"],
      "env": {
        "notionToken": "ntn_xxx..."
      }
    },
    "google-calendar": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "petaio/mcp-google-calendar:latest"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "figma": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "petaio/mcp-figma:latest"],
      "env": {
        "accessToken": "figd_xxx..."
      }
    },
    "rest-gateway": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "GATEWAY_CONFIG", "petaio/mcp-rest-gateway:latest"],
      "env": {
        "GATEWAY_CONFIG": "{\"apis\":[{\"name\":\"example-api\",\"baseUrl\":\"https://api.example.com\",\"auth\":{\"type\":\"bearer\",\"token\":\"${API_KEY}\"},\"tools\":[...]}]}"
      }
    }
  }
}
```

### Option 2: Direct Node.js

If you prefer running servers directly without Docker:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-postgres/dist/index.js"],
      "env": {
        "POSTGRES_URL": "postgresql://user:password@localhost:5432/dbname",
        "ACCESS_MODE": "readonly"
      }
    },
    "google-drive": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-google-drive/dist/stdio.js"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "notion": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-notion/dist/stdio.js"],
      "env": {
        "notionToken": "ntn_xxx..."
      }
    },
    "google-calendar": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-google-calendar/dist/stdio.js"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "figma": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-figma/dist/stdio.js"],
      "env": {
        "accessToken": "figd_xxx..."
      }
    },
    "rest-gateway": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-rest-gateway/dist/stdio.js"],
      "env": {
        "GATEWAY_CONFIG": "{\"apis\":[{\"name\":\"example-api\",\"baseUrl\":\"https://api.example.com\",\"auth\":{\"type\":\"bearer\",\"token\":\"${API_KEY}\"},\"tools\":[...]}]}"
      }
    }
  }
}
```

Refer to each server's documentation for specific configuration details.

## Creating a New MCP Server

To create a new MCP server in this repository:

1. Copy the `mcp-server-template` directory:
   ```bash
   cp -r mcp-server-template mcp-your-new-server
   cd mcp-your-new-server
   ```

2. Follow the checklist in `NEW_PROJECT_CHECKLIST.md`

3. Read `TEMPLATE_GUIDE.md` for detailed instructions

4. Implement your server logic in the `src/` directory

5. Update the main README.md to include your new server

## Development Guidelines

- Each server should be self-contained with its own dependencies
- Follow TypeScript best practices
- Include comprehensive documentation
- Add tests for critical functionality
- Use environment variables for configuration
- Follow the MCP specification

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## Resources

- [MCP Specification](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Claude Desktop Documentation](https://claude.ai/docs)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Copyright (c) 2025 Dunia Labs, Inc.

All MCP servers in this repository are licensed under the MIT License.

## Support

For issues or questions specific to a server, please refer to that server's documentation. For general questions about this repository, please open an issue.
