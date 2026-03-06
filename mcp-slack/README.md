# Slack MCP Server

Slack MCP server for PETA ecosystem with STDIO transport.

## Tools

1. `slackSendMessage`
2. `slackListChannels`
3. `slackGetChannelInfo`
4. `slackListMessages`
5. `slackGetMessage`
6. `slackGetThreadReplies`
7. `slackUpdateMessage`
8. `slackDeleteMessage`
9. `slackAddReaction`
10. `slackRemoveReaction`
11. `slackListUsers`
12. `slackGetUserInfo`
13. `slackSetChannelTopic`
14. `slackInviteUserToChannel`
15. `slackKickUserFromChannel`
16. `slackCreateChannel`
17. `slackArchiveChannel`

## OAuth Scope (User Token)

Required user scopes for current tools:

### Message Write
- `chat:write`

### Public Channels (`channels:*`)
- `channels:read`
- `channels:history`
- `channels:write`
- `channels:write.invites`

### Private Channels / Groups (`groups:*`)
- `groups:read`
- `groups:history`
- `groups:write`
- `groups:write.invites`

### Users (`users:*`)
- `users:read`
- `users:read.email`

### Reactions
- `reactions:write`

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`

No browser OAuth flow is implemented in this server.

## Development Environment Configuration

### 1) Local Node.js Startup

```bash
cd mcp-slack
cp .env.example .env
# Fill in accessToken in .env
npm install
npm run build
npm start
```

### 2) `.env` Example

```bash
accessToken=xoxp-example
SERVER_NAME=mcp-slack
NODE_ENV=development
```

### 3) Claude Desktop (Local Development)

Docker configuration:

```json
{
  "mcpServers": {
    "slack": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/slack:latest"
      ],
      "env": {
        "accessToken": "xoxp-example"
      }
    }
  }
}
```

Node.js configuration:

```json
{
  "mcpServers": {
    "slack": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-slack/dist/stdio.js"],
      "env": {
        "accessToken": "xoxp-example"
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

## Docker

```bash
./build-docker.sh
```

## Tool Notes

- Slack API can return rate limit errors (429); this server retries with backoff and `Retry-After`.
- For private channels, the authorized user account must be a channel member to read and post.
- `slackInviteUserToChannel` follows Slack `conversations.invite` requirements:
  - The authorized user must already be a member of the target channel.
  - Required scopes must include both write and invite scopes for the target channel type
    (`channels:write` + `channels:write.invites` for public, `groups:write` + `groups:write.invites` for private).
- `slackGetThreadReplies` depends on Slack thread/replies API availability for your app distribution model.
- Without `users:read.email`, Slack user objects may omit `profile.email`; this server will return email as empty/undefined.
- File upload tool is intentionally excluded to avoid large payloads in MCP conversations.
