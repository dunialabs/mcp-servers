# Google Forms MCP Server

Google Forms MCP server for PETA ecosystem with STDIO transport.

## MCP Apps

Compatible MCP Apps clients can render richer views for:

- `gformsGetForm`
- `gformsListResponses`
- `gformsGetResponse`

These tools keep their original text fallback for non-Apps clients and add `structuredContent` plus App resources for compatible hosts.

## Tools (12)

1. `gformsCreateForm`
2. `gformsGetForm`
3. `gformsBatchUpdateForm`
4. `gformsSetPublishSettings`
5. `gformsAddTextQuestion`
6. `gformsAddMultipleChoiceQuestion`
7. `gformsListResponses`
8. `gformsGetResponse`
9. `gformsListResponsesSince`
10. `gformsListForms`
11. `gformsExtractFormId`
12. `gformsGetFormSummary`

## OAuth Scope

Required scopes for current toolset:

- `https://www.googleapis.com/auth/forms.body` (Google Forms API)
- `https://www.googleapis.com/auth/forms.responses.readonly` (Google Forms API)
- `https://www.googleapis.com/auth/drive.metadata.readonly` (Google Drive API v3)

Optional identity scopes for Console/Core account linkage:

- `openid`
- `email`
- `profile`

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`
  - `accessToken` (preferred)
  - `token` (compatible)

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-google-forms
cp .env.example .env
# Fill in accessToken in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=ya29.example
SERVER_NAME=mcp-google-forms
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "google-forms": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/google-forms:latest"
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
    "google-forms": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-google-forms/dist/stdio.js"],
      "env": {
        "accessToken": "ya29.example"
      }
    }
  }
}
```

## Docker

```bash
./build-docker.sh
```

## Build Notes

`npm run build` now runs both:

- server TypeScript compilation
- `npm run build:app` for the Forms MCP Apps HTML resources

If you change files under `ui/`, rebuild before testing:

```bash
npm run build
```

## Tool Notes

- `gformsCreateForm` supports `autoPublish` to handle post-2026 publish behavior.
- `gformsListForms` depends on Drive metadata scope to discover `formId`.
- `gformsExtractFormId` helps parse IDs from edit URLs quickly.
- `gformsListResponsesSince` expects RFC3339 UTC timestamp input.
- `gformsGetFormSummary` supports `latestResponseScanLimit` (default `200`) to bound
  full-response scanning cost when `includeLatestResponse=true`.
- `gformsGetFormSummary` returns `latestResponseMeta` with `scanLimit`, `scannedCount`,
  and `reachedLimit` so callers can detect partial scans.
- For Forms API response filters, this implementation uses unquoted timestamp syntax
  (e.g. `timestamp >= 2026-03-17T00:00:00Z`) based on live API validation.
