# Google Calendar MCP Server

Model Context Protocol (MCP) server for Google Calendar integration. Built for PETA Desk integration with STDIO transport.

## Features

- **10 tools**:
  - `gcalendarListCalendars` - List all calendars
  - `gcalendarListEvents` - List events from a calendar
  - `gcalendarSearchEvents` - Search events by query
  - `gcalendarCreateEvent` - Create new events with attendees and reminders
  - `gcalendarUpdateEvent` - Update existing events
  - `gcalendarDeleteEvent` - Delete events
  - `gcalendarGetFreeBusy` - Query free/busy information
  - `gcalendarQuickAdd` - Create events from natural language
  - `gcalendarCreateCalendar` - Create new calendars
  - `gcalendarDeleteCalendar` - Delete calendars

- Read/write access to calendars and events
- STDIO transport (stdin/stdout communication)
- Dynamic token updates without server restart

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Pull from Docker Hub
docker pull petaio/mcp-google-calendar:latest

# Run with your Google OAuth access token
export accessToken='ya29.xxx...'
docker run -i --rm -e accessToken petaio/mcp-google-calendar:latest

# Or build locally
npm run build
docker build -t petaio/mcp-google-calendar:latest .
```

### Option 2: Direct Node.js

```bash
# Install and build
npm install
npm run build

# Run
export accessToken='ya29.xxx...'
node dist/stdio.js
```

### For PETA Core Integration

PETA Core will automatically:
1. Start this MCP server with STDIO transport (Docker or Node.js)
2. Provide Google OAuth access token via `accessToken` environment variable
3. Manage token refresh and server lifecycle

No manual configuration needed!

**Docker launchConfig:**
```json
{
  "command": "docker",
  "args": ["run", "--pull=always", "-i", "--rm", "-e", "accessToken", "petaio/mcp-google-calendar:latest"],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

**Node.js launchConfig:**
```json
{
  "command": "node",
  "args": ["/path/to/mcp-google-calendar/dist/stdio.js"],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

## Authentication

The server reads the Google OAuth access token from the `accessToken` environment variable.

**Note**: Token refresh is handled by PETA Core. This server only needs the access token.

## Required Google OAuth Scopes

- `https://www.googleapis.com/auth/calendar` - Full access to Google Calendar

## Environment Variables

### Required
- `accessToken` - Google OAuth access token (provided by peta-core)

### Optional - Proxy Configuration
- `HTTP_PROXY` / `http_proxy` - HTTP proxy URL
- `HTTPS_PROXY` / `https_proxy` - HTTPS proxy URL
- `NO_PROXY` / `no_proxy` - Hosts to bypass proxy

**Note**: Proxy is disabled by default in Docker images to prevent connection issues.

## Tool Examples

### List Calendars
```json
{
  "name": "gcalendarListCalendars",
  "arguments": {
    "maxResults": 10
  }
}
```

### Create Event
```json
{
  "name": "gcalendarCreateEvent",
  "arguments": {
    "calendarId": "primary",
    "summary": "Team Meeting",
    "description": "Quarterly planning session",
    "start": {
      "dateTime": "2024-12-01T10:00:00-05:00",
      "timeZone": "America/New_York"
    },
    "end": {
      "dateTime": "2024-12-01T11:00:00-05:00",
      "timeZone": "America/New_York"
    },
    "attendees": [
      { "email": "colleague@example.com" }
    ],
    "reminders": {
      "useDefault": false,
      "overrides": [
        { "method": "email", "minutes": 60 },
        { "method": "popup", "minutes": 10 }
      ]
    }
  }
}
```

### Quick Add (Natural Language)
```json
{
  "name": "gcalendarQuickAdd",
  "arguments": {
    "text": "Lunch with Sarah tomorrow at 12pm"
  }
}
```

### Get Free/Busy
```json
{
  "name": "gcalendarGetFreeBusy",
  "arguments": {
    "calendarIds": ["primary", "colleague@example.com"],
    "timeMin": "2024-12-01T09:00:00Z",
    "timeMax": "2024-12-01T17:00:00Z"
  }
}
```

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

## Docker Build

```bash
# Local build (current platform)
./build-docker.sh

# Multi-platform build (amd64, arm64)
./build-docker.sh multi

# Build and push to Docker Hub
./build-docker.sh push

# Clean up builders
./build-docker.sh clean
```

## License

MIT
