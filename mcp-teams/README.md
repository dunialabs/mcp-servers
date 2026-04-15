# Teams MCP Server

Microsoft Teams MCP server for PETA ecosystem with STDIO transport.

## Tools (24)

### Teams (4)
1. `teamsListJoinedTeams`
2. `teamsGetTeam`
3. `teamsListTeamMembers`
4. `teamsListTeamChannels`

### Channels (4)
5. `teamsGetChannel`
6. `teamsListChannelMessages`
7. `teamsListChannelMessageReplies`
8. `teamsReplyToChannelMessage`

### Chats (7)
9. `teamsListChats`
10. `teamsGetChat`
11. `teamsCreateChat`
12. `teamsListChatMessages`
13. `teamsSendChatMessage`
14. `teamsUpdateChatMessage`
15. `teamsDeleteChatMessage`

### Messages (7)
16. `teamsSendChannelMessage`
17. `teamsUpdateChannelMessage`
18. `teamsDeleteChannelMessage`
19. `teamsSetMessageReaction`
20. `teamsUnsetMessageReaction`
21. `teamsGetMessage`
22. `teamsGetMessageThread`

### Users (2)
23. `teamsListUsers`
24. `teamsSearchUsers`

## OAuth Scope (Delegated)

### Base Login
- `openid`
- `profile`
- `offline_access`
- `User.Read`

### Teams / Channels Metadata
- `Team.ReadBasic.All`
- `Channel.ReadBasic.All`
- `TeamMember.Read.All`

### Channel Messages
- `ChannelMessage.Read.All`
- `ChannelMessage.Send`
- `ChannelMessage.ReadWrite`

### Chat Capabilities
- `Chat.ReadBasic`
- `Chat.Read`
- `Chat.Create`
- `Chat.ReadWrite`

### User Directory
- `User.ReadBasic.All`

## Admin Consent Requirement

For enterprise Teams usage, admin consent is typically required before normal users can connect.

Required flow:
1. Tenant admin grants consent once for the Teams app scopes using the admin consent URL:
   ```
   https://login.microsoftonline.com/{tenant_id}/adminconsent
     ?client_id={your_app_client_id}
     &redirect_uri={your_redirect_uri}
     &state={optional_state}
   ```
   - `tenant_id` — Azure AD tenant ID (or `common` for multi-tenant apps)
   - `client_id` — Application (client) ID from Azure Portal
   - `redirect_uri` — Must match the registered redirect URI exactly
2. Regular users authorize in Console.
3. Core injects `accessToken` to MCP runtime.

Without admin consent, users usually see `Need admin approval` and cannot finish authorization.

## Runtime Token Model

This server reads `process.env.accessToken` and supports runtime token updates from Core via:

- `notifications/token/update`
  - `token` or `accessToken`

No browser OAuth flow is implemented in this server.

## Development

```bash
cd mcp-teams
cp .env.example .env
npm install
npm run build
npm start
```

## Configuration Examples

### Claude Desktop (Docker)

```json
{
  "mcpServers": {
    "teams": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "accessToken",
        "ghcr.io/dunialabs/mcp-servers/teams:latest"
      ],
      "env": {
        "accessToken": "your_microsoft_graph_oauth_token"
      }
    }
  }
}
```

### Claude Desktop (Local Node)

```json
{
  "mcpServers": {
    "teams": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-teams/dist/stdio.js"],
      "env": {
        "accessToken": "your_microsoft_graph_oauth_token"
      }
    }
  }
}
```

## Docker

```bash
./build-docker.sh
```
