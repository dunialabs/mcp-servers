# Intercom MCP Server

A Model Context Protocol (MCP) server that integrates with Intercom API v2.11, enabling Claude to manage conversations, contacts, companies, and more.

**Built with TypeScript + MCP SDK + Intercom API**

---

## Features

- **Contact Management**: List, search, get, create, and update contacts (users and leads)
- **Conversation Management**: List, search, get, reply, close, and assign conversations
- **Company Management**: List and get companies
- **Tag Management**: List tags and tag contacts
- **Note Management**: Add internal notes to contacts
- **Multi-Region Support**: US, EU, and AU region endpoints
- **OAuth Integration**: Seamless token management via Console platform
- **Docker Support**: Multi-platform images (amd64/arm64)
- **Complete TypeScript**: Strict typing with Zod validation
- **Production Ready**: Error handling, logging, timeout management

---

## Available Tools (16)

### Contact Tools
- `intercomListContacts` - List all contacts with pagination
- `intercomSearchContacts` - Search contacts by email, name, role, etc.
- `intercomGetContact` - Get detailed contact information
- `intercomCreateContact` - Create a new contact (user or lead)
- `intercomUpdateContact` - Update an existing contact's fields
- `intercomAddNote` - Add an internal note to a contact

### Conversation Tools
- `intercomListConversations` - List all conversations
- `intercomSearchConversations` - Search conversations by state, assignee, etc.
- `intercomGetConversation` - Get full conversation with message history
- `intercomReplyConversation` - Reply to a conversation (comment or internal note)
- `intercomCloseConversation` - Close an open conversation
- `intercomAssignConversation` - Assign a conversation to an admin or team

### Company Tools
- `intercomListCompanies` - List all companies with pagination
- `intercomGetCompany` - Get detailed company information

### Tag Tools
- `intercomListTags` - List all tags in the workspace
- `intercomTagContact` - Apply a tag to a contact

---

## Quick Start

### Prerequisites

- Node.js 18+ or Docker
- Intercom OAuth access token (see [Authentication](#authentication))

### Installation

```bash
# Clone or navigate to the project
cd mcp-intercom

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your accessToken
```

### Running the Server

#### Option 1: Development Mode

```bash
npm run dev
```

#### Option 2: Production Build

```bash
npm run build
npm start
```

#### Option 3: Docker

```bash
# Build Docker image
docker build -t mcp-intercom:latest .

# Run with Docker
docker run -i --rm \
  -e accessToken="your_token_here" \
  -e intercomRegion="us" \
  mcp-intercom:latest
```

---

## Authentication

This server uses OAuth 2.0 authentication with Intercom API.

### For Production (Console Platform)

The Console platform automatically manages OAuth tokens:

1. Configure your app in Console with Intercom integration
2. Console handles OAuth flow and token refresh
3. Token is provided via `accessToken` environment variable
4. Region is provided via `intercomRegion` environment variable
5. Server receives token updates via MCP notifications

### For Local Development

To get a test token for local development:

1. Log in to Intercom: https://app.intercom.com
2. Go to Developer Hub and create/select an App
3. Configure Redirect URL for OAuth
4. Complete OAuth flow to get `access_token`

**Required OAuth Scopes**:

| Scope | Status | Used by |
|-------|--------|---------|
| `contacts.read` | active | `intercomListContacts`, `intercomSearchContacts`, `intercomGetContact` |
| `contacts.write` | active | `intercomCreateContact`, `intercomUpdateContact`, `intercomAddNote`, `intercomTagContact` |
| `conversations.read` | active | `intercomListConversations`, `intercomSearchConversations`, `intercomGetConversation` |
| `conversations.write` | active | `intercomReplyConversation`, `intercomCloseConversation`, `intercomAssignConversation` |
| `companies.read` | active | `intercomListCompanies`, `intercomGetCompany` |
| `tags.read` | active | `intercomListTags` |
| `companies.write` | reserved | Create/update companies, attach contacts to companies |
| `tags.write` | reserved | Create/delete tags, tag conversations and companies |
| `admins.read` | reserved | List admins and teams (for conversation assignment) |

---

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
accessToken=your_intercom_oauth_token_here

# Region (default: us)
intercomRegion=us   # Options: us, eu, au

# Optional
LOG_LEVEL=info                 # debug, info, warn, error
NODE_ENV=production            # development, production
INTERCOM_API_TIMEOUT=30000     # API timeout in milliseconds
```

### Region Configuration

Intercom workspaces are hosted in different regions. Configure the correct region:

| Region | Environment Value | API Base URL |
|--------|-------------------|--------------|
| US (Default) | `us` | `https://api.intercom.io` |
| EU | `eu` | `https://api.eu.intercom.io` |
| AU | `au` | `https://api.au.intercom.io` |

**How to find your workspace region:** Log in to Intercom and check the URL in your browser's address bar:

- `app.intercom.com` → set `intercomRegion=us`
- `app.eu.intercom.com` → set `intercomRegion=eu`
- `app.au.intercom.com` → set `intercomRegion=au`

Setting the wrong region will result in a `401 Unauthorized` error.

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "intercom": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-intercom/dist/stdio.js"],
      "env": {
        "accessToken": "your_oauth_token_here",
        "intercomRegion": "us"
      }
    }
  }
}
```

**Using Docker** (recommended for production):

```json
{
  "mcpServers": {
    "intercom": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "accessToken",
        "-e", "intercomRegion",
        "ghcr.io/dunialabs/mcp-servers/intercom:latest"
      ],
      "env": {
        "accessToken": "your_oauth_token_here",
        "intercomRegion": "us"
      }
    }
  }
}
```

Restart Claude Desktop after configuration.

---

## Usage Examples

### List Contacts

```typescript
// Ask Claude:
"Show me the first 10 contacts in Intercom"

// Claude will call:
{
  "name": "intercomListContacts",
  "arguments": {
    "per_page": 10
  }
}
```

### Search for a Contact by Email

```typescript
// Ask Claude:
"Find the contact with email john@example.com"

// Claude will call:
{
  "name": "intercomSearchContacts",
  "arguments": {
    "query": {
      "operator": "AND",
      "value": [
        { "field": "email", "operator": "=", "value": "john@example.com" }
      ]
    }
  }
}
```

### Create a New Lead

```typescript
// Ask Claude:
"Create a new lead with email jane@example.com and name Jane Doe"

// Claude will call:
{
  "name": "intercomCreateContact",
  "arguments": {
    "role": "lead",
    "email": "jane@example.com",
    "name": "Jane Doe"
  }
}
```

### List Open Conversations

```typescript
// Ask Claude:
"Show me all open conversations"

// Claude will call:
{
  "name": "intercomSearchConversations",
  "arguments": {
    "query": {
      "operator": "AND",
      "value": [
        { "field": "state", "operator": "=", "value": "open" }
      ]
    }
  }
}
```

### Reply to a Conversation

```typescript
// Ask Claude:
"Reply to conversation 123 with 'Thanks for reaching out!'"

// Claude will call:
{
  "name": "intercomReplyConversation",
  "arguments": {
    "conversationId": "123",
    "message_type": "comment",
    "type": "admin",
    "admin_id": "your_admin_id",
    "body": "Thanks for reaching out!"
  }
}
```

---

## Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode (hot reload) |
| `npm run build` | Build TypeScript |
| `npm start` | Run built code |
| `npm run clean` | Clean build directory |
| `npm test` | Run tests |
| `npm run lint` | Check code standards |
| `npm run lint:fix` | Auto-fix code standards |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

### Project Structure

```
mcp-intercom/
├── src/
│   ├── stdio.ts              # STDIO entry point
│   ├── server.ts             # MCP server + tool registration
│   ├── index.ts              # Module exports
│   ├── auth/
│   │   └── token.ts          # OAuth token management
│   ├── tools/
│   │   ├── contacts.ts       # Contact management tools
│   │   ├── conversations.ts  # Conversation management tools
│   │   ├── companies.ts      # Company management tools
│   │   ├── tags.ts           # Tag management tools
│   │   └── notes.ts          # Note management tools
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       ├── intercom-api.ts   # HTTP client for Intercom API
│       ├── errors.ts         # Error handling utilities
│       └── logger.ts         # Logging system
├── tests/                     # Test files
├── dist/                      # Build output
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

---

## Security Considerations

- **Input Validation**: All inputs validated with Zod schemas
- **Environment Variables**: Tokens stored securely in environment
- **Error Handling**: No sensitive data exposed in error messages
- **Token Refresh**: Automatic token updates from Console platform
- **API Rate Limits**: Respects Intercom API rate limits

---

## API Documentation

- [Intercom API Documentation](https://developers.intercom.com/docs)
- [Intercom API Reference](https://developers.intercom.com/docs/references/rest-api/api.intercom.io/Contacts/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

## Troubleshooting

### Token Issues

```
Error: Missing Intercom credentials
```

**Solution**: Ensure `accessToken` environment variable is set correctly.

### Region Mismatch

```
Error: 401 Unauthorized
```

**Solution**: Verify `intercomRegion` matches your Intercom workspace region (US, EU, or AU).

### API Rate Limits

Intercom API has rate limits per endpoint. If you hit rate limits:

**Solution**: Implement retry logic with exponential backoff if needed.

### Connection Issues

```
Error: Request timeout after 30000ms
```

**Solution**:
1. Check network connectivity
2. Increase timeout: `INTERCOM_API_TIMEOUT=60000`
3. Verify Intercom API status

---

## License

MIT License - Free to use and modify

---

## Contributing

Contributions welcome! Please ensure:
- TypeScript compiles without errors
- All tests pass
- Code follows ESLint/Prettier standards
- New tools include proper documentation

---

## Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [Intercom API](https://developers.intercom.com)
- Based on [mcp-server-template](https://github.com/dunialabs/mcp-servers/tree/main/mcp-server-template)

---

**Happy customer support with Intercom and Claude!**
