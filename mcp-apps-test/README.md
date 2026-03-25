# MCP Apps Test

A dedicated MCP server for testing MCP Apps support with two mock interactive tools.

## Purpose

This project is not tied to any external API or OAuth flow.
It exists to validate:
- MCP Apps view rendering
- `_meta.ui.resourceUri` tool declarations
- `structuredContent` delivery
- fallback text rendering for clients that do not support MCP Apps
- stdio, HTTP, and Docker-based MCP testing flows

## Available Tools

### 1. `playgroundListCards`
Returns a configurable set of mock cards.

Use cases:
- test card/grid rendering
- test refresh behavior
- test list-style fallback output

Example arguments:
```json
{
  "title": "MCP Apps Demo",
  "count": 6,
  "category": "design",
  "layout": "grid"
}
```

### 2. `playgroundTimeline`
Returns a configurable mock timeline.

Use cases:
- test timeline/agenda rendering
- test time-based layouts
- test fallback output for non-App clients

Example arguments:
```json
{
  "startDate": "2026-03-25",
  "days": 4,
  "density": 2,
  "theme": "clean"
}
```

## Fallback Behavior

Both tools are Apps-enhanced tools:
- MCP Apps-aware clients render the interactive view
- non-App clients still receive readable text content

This means the server remains usable even when the client ignores the App resource.

## Transports

- `stdio`: for Claude Desktop and local MCP testing
- `http`: for local MCP Apps host testing

## Development

Install dependencies:

```bash
npm install
```

Build server and App resources:

```bash
npm run build
```

Run stdio mode:

```bash
npm run start
```

Run HTTP mode:

```bash
npm run start:http
```

## Claude Desktop Configuration

Add this to your Claude Desktop config:

```json
{
  "mcpServers": {
    "apps-test": {
      "command": "node",
      "args": [
        "/Users/tataufo/mcp-servers/mcp-apps-test/dist/stdio.js"
      ]
    }
  }
}
```

After updating the config:
1. Run `npm run build`
2. Restart Claude Desktop
3. Call `playgroundListCards` or `playgroundTimeline`

## Docker

Build local image:

```bash
./build-docker.sh
```

Run locally:

```bash
docker run -i --rm ghcr.io/dunialabs/mcp-servers/apps-test:latest
```

Claude Desktop with Docker:

```json
{
  "mcpServers": {
    "apps-test": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "ghcr.io/dunialabs/mcp-servers/apps-test:latest"
      ]
    }
  }
}
```

## HTTP Testing

Start the local HTTP MCP endpoint:

```bash
npm run start:http
```

Default endpoint:

```text
http://127.0.0.1:3001/mcp
```

This is intended for MCP Apps host testing, not direct browser page access.
