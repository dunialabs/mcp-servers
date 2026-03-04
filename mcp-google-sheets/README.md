# Google Sheets MCP Server

Google Sheets MCP server for PETA ecosystem with STDIO transport.

## Tools

1. `gsheetsGetSpreadsheet`
2. `gsheetsListSpreadsheets`
3. `gsheetsCreateSpreadsheet`
4. `gsheetsReadValues`
5. `gsheetsBatchReadValues`
6. `gsheetsUpdateValues`
7. `gsheetsAppendValues`
8. `gsheetsClearValues`
9. `gsheetsAddSheet`
10. `gsheetsDeleteSheet`
11. `gsheetsDuplicateSheet`

## OAuth Scope

Primary scope:

- `https://www.googleapis.com/auth/spreadsheets`
- `https://www.googleapis.com/auth/drive.metadata.readonly` (required for `gsheetsListSpreadsheets`)

Optional identity scopes for Console/Core account linkage:

- `openid`
- `email`
- `profile`

Optional:

- `https://www.googleapis.com/auth/drive.file` (for app-created file access patterns)

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-google-sheets
cp .env.example .env
# Fill in accessToken in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=ya29.example
SERVER_NAME=mcp-google-sheets
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/google-sheets:latest"
      ],
      "env": {
        "accessToken": "ya29.example"
      }
    }
  }
}
```

Node.js configuration:

```json
{
  "mcpServers": {
    "google-sheets": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-google-sheets/dist/stdio.js"],
      "env": {
        "accessToken": "ya29.example"
      }
    }
  }
}
```

## PetaConsole Configuration (PETA Core)

PetaConsole / Core will automatically:
1. Start this MCP server via STDIO transport (Docker or Node.js)
2. Inject the `accessToken` environment variable
3. Refresh tokens and notify the running process through `notifications/token/update`

### Docker launchConfig

```json
{
  "command": "docker",
  "args": [
    "run",
    "--pull=always",
    "-i",
    "--rm",
    "-e",
    "accessToken",
    "ghcr.io/dunialabs/mcp-servers/google-sheets:latest"
  ],
  "env": {
    "accessToken": "ya29.example"
  }
}
```

### Node.js launchConfig

```json
{
  "command": "node",
  "args": ["/path/to/mcp-google-sheets/dist/stdio.js"],
  "env": {
    "accessToken": "ya29.example"
  }
}
```

## Docker

```bash
./build-docker.sh
```

## Tool Notes

- `gsheetsBatchReadValues` limits range count to 50 per request.
- `gsheetsUpdateValues` and `gsheetsAppendValues` enforce payload shape limits.
- Use `gsheetsListSpreadsheets` to discover `spreadsheetId` before read/write operations.
