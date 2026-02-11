# Peta MCP Servers

A collection of MCP (Model Context Protocol) servers for Peta Core, created by Dunia Labs

These are MCP servers optimized for efficient and effective use with Peta Core. They can be connected to Peta Core and configured directly for immediate use, or run independently without Peta.

When used with Peta Core, you get:

- Secure credential management — API credentials and sensitive information are stored in the vault, never exposed externally, and accessed only when needed
- Multi-tenant support — Serve multiple users or organizations from a single deployment
- Granular permissions — Assign different access levels and permissions to different API keys
- Human-in-the-loop approval — Require explicit human approval for risky or sensitive operations before execution


## Available Servers

### 1. MCP Google Drive Server
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

### 2. MCP PostgreSQL Server
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

### 3. MCP Notion Server
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

### 4. MCP Google Calendar Server
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

### 5. MCP Figma Server
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

### 6. MCP REST Gateway
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

### 7. MCP GitHub Server
**Directory:** `mcp-github/`

An MCP server for GitHub integration, enabling AI assistants to interact with GitHub repositories, issues, pull requests, and more.

**Features:**

- 39 tools for GitHub operations
- Repository management (create, read, update, delete, search)
- Issue management (create, read, update, delete, comment, label)
- Pull request operations (create, read, update, merge, review)
- Commit and branch management
- User and organization operations
- Team management
- File operations
- Search capabilities
- STDIO transport
- Docker support (amd64/arm64)
- Token-based authentication
- Runtime token refresh

[View Documentation →](./mcp-github/README.md)

---

### 8. MCP Zendesk Server
**Directory:** `mcp-zendesk/`

An MCP server for Zendesk integration, enabling AI assistants to manage tickets, users, and organizations.

**Features:**

- 18 tools for Zendesk operations
- Ticket management (list, get, create, update, delete, comments, search)
- User management (list, get, create, update, delete)
- Organization management (list, get, create, update, delete)
- Hybrid authentication (OAuth token + API token)
- Token refresh via MCP notifications
- STDIO transport
- Docker support (amd64/arm64)
- API-compliant implementation

[View Documentation →](./mcp-zendesk/README.md)

---

### 9. MCP Skills Server
**Directory:** `mcp-skills/`

An MCP server that brings filesystem-based Agent Skills to Claude Desktop, VS Code, Cursor, and other MCP-compatible platforms.

**Features:**

- Filesystem-based skills with simple directory structures
- Progressive loading system (metadata → instructions → resources)
- 3 MCP tools: `listSkills`, `getSkill`, `readSkillFile`
- Scripts support for any language (Python, Node.js, Ruby, Go, etc.)
- Sandbox script execution in Claude's environment
- Skills include instructions (SKILL.md), scripts, references, and assets
- Production-ready example skills included
- STDIO transport
- Docker support (amd64/arm64)
- Lightweight container (222MB)

[View Documentation →](./mcp-skills/README.md)

---

### 10. MCP Canva Server
**Directory:** `mcp-canva/`

An MCP server for Canva integration, enabling AI assistants to create and manage designs, assets, folders, exports, imports, and brand templates through Canva Connect API v1.

**Features:**

- 30+ tools for Canva operations
- Design management (create, list, get, pages, export formats)
- Asset management (upload, get, update, delete, status tracking)
- Folder operations (create, update, delete, list items, move items)
- Export operations (PDF, JPG, PNG, PPTX, GIF, MP4, SVG with format-specific options)
- Import operations (import from URL with status tracking)
- Brand template tools (list, get, dataset, autofill with text/image/chart data)
- User information (profile, capabilities)
- OAuth 2.0 authentication with token refresh
- STDIO transport
- Docker support (amd64/arm64)
- Complete TypeScript with strict typing and Zod validation

[View Documentation →](./mcp-canva/README.md)

---

### 11. MCP Stripe Server
**Directory:** `mcp-stripe/`

An MCP server for Stripe integration, enabling AI assistants to process payments, manage customers, handle subscriptions, and perform billing operations through Stripe API.

**Features:**

- 28 tools for Stripe operations
- Payment Intents (create, confirm, cancel, retrieve, list) - One-time payments
- Customer management (create, get, update, list, delete)
- Refund operations (create, get, list)
- Product catalog (create, get, update, list, delete)
- Pricing models (create, get, update, list) - One-time & recurring
- Subscription lifecycle (create, get, update, cancel, resume, list)
- Dual authentication modes (Platform keys + Stripe Connect)
- PCI DSS compliant (no card data handling)
- Idempotency support for safe retries
- STDIO transport
- Docker support (amd64/arm64)
- Complete TypeScript with strict typing and Zod validation
- Production-ready error handling and logging

[View Documentation →](./mcp-stripe/README.md)

---

### 12. MCP Google Docs Server
**Directory:** `mcp-google-docs/`

An MCP server for Google Docs integration, enabling AI assistants to read, write, and edit Google Documents with Markdown support.

**Features:**

- 13 tools for Google Docs operations
- Document discovery (list, search)
- Document operations (create, read with Markdown/text/JSON output)
- Content editing (insert text, replace, delete range)
- Markdown support (write, append with inline **bold**, *italic*, ~~strikethrough~~)
- Text formatting (bold, italic, underline, font, color, links)
- Paragraph formatting (alignment, headings, spacing, indentation)
- Structural elements (insert table, insert image from URL)
- STDIO transport
- Docker support (amd64/arm64)
- Token-based authentication with runtime refresh

[View Documentation →](./mcp-google-docs/README.md)

---

### 13. MCP Intercom Server
**Directory:** `mcp-intercom/`

An MCP server for Intercom integration, enabling AI assistants to manage conversations, contacts, companies, tags, and notes through Intercom API v2.11.

**Features:**

- 16 tools for Intercom operations
- Contact management (list, search, get, create, update, add note)
- Conversation management (list, search, get, reply, close, assign)
- Company management (list, get)
- Tag management (list, apply to contact)
- Multi-region support (US, EU, AU)
- OAuth 2.0 authentication with runtime token refresh
- STDIO transport
- Docker support (amd64/arm64)
- Complete TypeScript with strict typing and Zod validation

[View Documentation →](./mcp-intercom/README.md)

---

## Repository Structure

```
peta-mcp-servers/
├── mcp-google-drive/        # Google Drive integration
├── mcp-postgres/            # PostgreSQL database integration
├── mcp-notion/              # Notion workspace integration
├── mcp-google-calendar/     # Google Calendar integration
├── mcp-figma/               # Figma design integration
├── mcp-rest-gateway/        # REST API to MCP gateway
├── mcp-github/              # GitHub integration
├── mcp-zendesk/             # Zendesk integration
├── mcp-skills/              # Filesystem-based Agent Skills
├── mcp-canva/               # Canva design integration
├── mcp-stripe/              # Stripe payment integration
├── mcp-google-docs/         # Google Docs integration
├── mcp-intercom/            # Intercom customer messaging integration
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

## Docker Images

All MCP servers are available as Docker images on GitHub Container Registry (GHCR):

- 🐳 **Multi-platform support**: linux/amd64 and linux/arm64 (Apple Silicon compatible)
- 📦 **View all packages**: https://github.com/dunialabs/mcp-servers/packages

### Available Images

| Server | Image | Latest Version |
|--------|-------|----------------|
| Google Drive | `ghcr.io/dunialabs/mcp-servers/google-drive` | v1.1.4 |
| PostgreSQL | `ghcr.io/dunialabs/mcp-servers/postgres` | v1.1.2 |
| Notion | `ghcr.io/dunialabs/mcp-servers/notion` | v1.1.1 |
| Figma | `ghcr.io/dunialabs/mcp-servers/figma` | v1.0.1 |
| Google Calendar | `ghcr.io/dunialabs/mcp-servers/google-calendar` | v1.0.1 |
| REST Gateway | `ghcr.io/dunialabs/mcp-servers/rest-gateway` | v1.0.1 |
| GitHub | `ghcr.io/dunialabs/mcp-servers/github` | v1.0.0 |
| Zendesk | `ghcr.io/dunialabs/mcp-servers/zendesk` | v1.0.0 |
| Skills | `ghcr.io/dunialabs/mcp-servers/skills` | v1.0.0 |
| Canva | `ghcr.io/dunialabs/mcp-servers/canva` | v1.0.0 |
| Stripe | `ghcr.io/dunialabs/mcp-servers/stripe` | v1.0.0 |
| Google Docs | `ghcr.io/dunialabs/mcp-servers/google-docs` | v1.0.0 |
| Intercom | `ghcr.io/dunialabs/mcp-servers/intercom` | v1.0.0 |

### Pull Images

```bash
# Pull specific version
docker pull ghcr.io/dunialabs/mcp-servers/google-drive:1.1.4

# Pull latest version
docker pull ghcr.io/dunialabs/mcp-servers/google-drive:latest
```

## Using with Claude Desktop

To use these MCP servers with Claude Desktop, add them to your Claude configuration file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Option 1: Docker via GHCR (Recommended)

Using GitHub Container Registry images provides better reliability and automatic multi-platform support:

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
        "ghcr.io/dunialabs/mcp-servers/postgres:latest"
      ],
      "env": {
        "POSTGRES_URL": "postgresql://user:password@localhost:5432/dbname",
        "ACCESS_MODE": "readonly"
      }
    },
    "google-drive": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/google-drive:latest"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "notion": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "notionToken", "ghcr.io/dunialabs/mcp-servers/notion:latest"],
      "env": {
        "notionToken": "ntn_xxx..."
      }
    },
    "google-calendar": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/google-calendar:latest"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "figma": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/figma:latest"],
      "env": {
        "accessToken": "figd_xxx..."
      }
    },
    "rest-gateway": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "GATEWAY_CONFIG", "ghcr.io/dunialabs/mcp-servers/rest-gateway:latest"],
      "env": {
        "GATEWAY_CONFIG": "{\"apis\":[{\"name\":\"example-api\",\"baseUrl\":\"https://api.example.com\",\"auth\":{\"type\":\"bearer\",\"token\":\"${API_KEY}\"},\"tools\":[...]}]}"
      }
    },
    "github": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/github:latest"],
      "env": {
        "accessToken": "ghp_xxx..."
      }
    },
    "zendesk": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "zendeskSubdomain", "-e", "zendeskEmail", "-e", "zendeskApiToken", "ghcr.io/dunialabs/mcp-servers/zendesk:latest"],
      "env": {
        "zendeskSubdomain": "mycompany",
        "zendeskEmail": "admin@mycompany.com",
        "zendeskApiToken": "your_api_token"
      }
    },
    "skills": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-v", "/Users/your-username/skills:/app/skills:ro", "-e", "skills_dir=/app/skills", "ghcr.io/dunialabs/mcp-servers/skills:latest"]
    },
    "canva": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/canva:latest"],
      "env": {
        "accessToken": "your_canva_oauth_token"
      }
    },
    "stripe": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "STRIPE_SECRET_KEY", "ghcr.io/dunialabs/mcp-servers/stripe:latest"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51xxxxx"
      }
    },
    "google-docs": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "ghcr.io/dunialabs/mcp-servers/google-docs:latest"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "intercom": {
      "command": "docker",
      "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "-e", "intercomRegion", "ghcr.io/dunialabs/mcp-servers/intercom:latest"],
      "env": {
        "accessToken": "your_intercom_oauth_token",
        "intercomRegion": "us"
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
    },
    "github": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-github/dist/stdio.js"],
      "env": {
        "accessToken": "ghp_xxx..."
      }
    },
    "zendesk": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-zendesk/dist/stdio.js"],
      "env": {
        "zendeskSubdomain": "mycompany",
        "zendeskEmail": "admin@mycompany.com",
        "zendeskApiToken": "your_api_token"
      }
    },
    "skills": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-skills/dist/stdio.js"],
      "env": {
        "skills_dir": "/Users/your-username/skills"
      }
    },
    "canva": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-canva/dist/stdio.js"],
      "env": {
        "accessToken": "your_canva_oauth_token"
      }
    },
    "stripe": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-stripe/dist/stdio.js"],
      "env": {
        "STRIPE_SECRET_KEY": "sk_test_51xxxxx"
      }
    },
    "google-docs": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-google-docs/dist/stdio.js"],
      "env": {
        "accessToken": "ya29.xxx..."
      }
    },
    "intercom": {
      "command": "node",
      "args": ["/path/to/peta-mcp-servers/mcp-intercom/dist/stdio.js"],
      "env": {
        "accessToken": "your_intercom_oauth_token",
        "intercomRegion": "us"
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
