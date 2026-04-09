# Gmail MCP Server

Gmail MCP server for PETA ecosystem with STDIO transport.

## Tools

1. `gmailListMessages`
2. `gmailGetMessage`
3. `gmailSendMessage`
4. `gmailModifyMessageLabels`
5. `gmailCreateDraft`
6. `gmailSendDraft`
7. `gmailListLabels`
8. `gmailTrashMessage`
9. `gmailUntrashMessage`
10. `gmailBatchModifyMessages`
11. `gmailGetAttachment`
12. `gmailDownloadAttachment`

## OAuth Scope

Use Gmail scope:

- `https://www.googleapis.com/auth/gmail.modify`

Identity scopes recommended for Console/Core account linkage:

- `openid`
- `email`
- `profile`

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`
  - `accessToken` or `token`

Updated tokens are normalized before use:

- Leading/trailing whitespace is trimmed
- Optional `Bearer ` prefix is removed

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-gmail
cp .env.example .env
# Fill in accessToken in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=ya29.example
SERVER_NAME=mcp-gmail
NODE_ENV=development
# Optional: constrain gmailDownloadAttachment output directory
# Default when not set: /tmp/gmail-attachments
# GMAIL_ATTACHMENT_OUTPUT_DIR=/absolute/path/for/attachments
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "gmail": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/gmail:latest"
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
    "gmail": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-gmail/dist/stdio.js"],
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
    "ghcr.io/dunialabs/mcp-servers/gmail:latest"
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
  "args": ["/path/to/mcp-gmail/dist/stdio.js"],
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

- `gmailListMessages` defaults to lightweight mode (`includeMessageDetails=false`) to avoid N+1 API calls.
- Set `includeMessageDetails=true` only when you need per-message headers (subject/from/to/date).
- `gmailSendMessage` supports `replyTo`, `inReplyTo`, and `references` for true reply threading behavior.

## MCP Apps

The following existing read tools are enhanced with MCP Apps views in supported clients:

- `gmailListMessages`
- `gmailGetMessage`

Search scenarios use `gmailListMessages` with the `q` parameter rather than a separate search tool.
Unsupported clients continue to receive the original text/JSON fallback.

`npm run build` now performs both the TypeScript build and `build:app`, which generates the
HTML resources used by the MCP Apps views.
