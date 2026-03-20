# BraveSearch MCP Server

Brave Search MCP server for PETA ecosystem with STDIO transport.

## Tools (6)

1. `braveSearchWeb`
2. `braveSearchLocal`
3. `braveSearchNews`
4. `braveSearchVideo`
5. `braveSearchImage`
6. `braveSummarizeByKey`

## Auth Model

This server uses Brave Search API key authentication (no OAuth redirect flow).

Required:
- `BRAVE_API_KEY`

Token runtime update is intentionally **not supported** in this server.
If API key changes, restart the MCP process.

## Environment Variables

Required:
- `BRAVE_API_KEY`

Optional:
- `BRAVE_API_BASE_URL` (default: `https://api.search.brave.com`)
- `BRAVE_API_VERSION` (optional Brave `Api-Version` header)
- `SERVER_NAME`
- `NODE_ENV`

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-bravesearch
cp .env.example .env
# Fill in BRAVE_API_KEY in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
BRAVE_API_KEY=your_brave_search_api_key
SERVER_NAME=mcp-bravesearch
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "bravesearch": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "BRAVE_API_KEY",
        "ghcr.io/dunialabs/mcp-servers/bravesearch:latest"
      ],
      "env": {
        "BRAVE_API_KEY": "your_brave_search_api_key"
      }
    }
  }
}
```

Node.js configuration:

```json
{
  "mcpServers": {
    "bravesearch": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-bravesearch/dist/stdio.js"],
      "env": {
        "BRAVE_API_KEY": "your_brave_search_api_key"
      }
    }
  }
}
```

## PetaConsole Configuration (PETA Core)

PetaConsole / Core should:
1. Start this MCP server via STDIO transport (Docker or Node.js).
2. Inject `BRAVE_API_KEY` as environment variable at process startup.

No runtime key refresh notification is used in this server.

## Docker

```bash
./build-docker.sh
```

## Tool Notes

- `braveSearchWeb` supports `summary=true`, and returns `summarizerKey` when available.
- `braveSummarizeByKey` requires `key` from `braveSearchWeb` response.
- `braveSearchImage` returns URL/metadata only (no base64 image payloads).
- API retries are enabled for `429` and `5xx` responses.
