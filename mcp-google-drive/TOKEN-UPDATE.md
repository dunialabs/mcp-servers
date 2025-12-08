# Token Update via Notification

## Overview

The MCP Google Drive server supports real-time token updates via MCP notifications. This allows peta-core to refresh the access token without restarting the server, providing a seamless user experience.

## Implementation

### MCP Server Side

The server registers a notification handler in `src/server.ts`:

```typescript
this.server.setNotificationHandler(
  {
    method: 'notifications/token/update',
    params: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        timestamp: { type: 'number' }
      },
      required: ['token']
    }
  } as any,
  async (notification: any) => {
    logger.info('[Token] Received token update notification');

    const newToken = notification.params.token;
    const timestamp = notification.params.timestamp;

    // Validate token format
    if (!newToken || typeof newToken !== 'string' || newToken.length === 0) {
      logger.error('[Token] Invalid token received in notification');
      return;
    }

    // Update environment variable (used by getCurrentToken() in token.ts)
    process.env.accessToken = newToken;

    logger.info('[Token] Access token updated successfully', {
      timestamp: timestamp ? new Date(timestamp).toISOString() : 'N/A',
      tokenPrefix: newToken.substring(0, 10) + '...'
    });
  }
);
```

### Notification Format

peta-core sends the following JSON-RPC notification:

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/token/update",
  "params": {
    "token": "ya29.new_access_token_here",
    "timestamp": 1698765432000
  }
}
```

**Parameters:**
- `token` (string, required): The new Google OAuth 2.0 access token
- `timestamp` (number, optional): Unix timestamp in milliseconds when the token was refreshed

### peta-core Integration

In peta-core, implement token refresh and notification sending:

```typescript
class MCPServerManager {
  /**
   * Refresh token and notify MCP server
   */
  async refreshTokenForServer(serverId: string) {
    try {
      // 1. Refresh token from OAuth provider
      const newToken = await this.oauthManager.refreshToken(serverId);

      // 2. Send notification to MCP server
      await this.sendTokenUpdateNotification(serverId, newToken);

      logger.info(`Token refreshed and updated for server: ${serverId}`);
    } catch (error) {
      logger.error(`Failed to refresh token for server ${serverId}:`, error);
      throw error;
    }
  }

  /**
   * Send token update notification to MCP server
   */
  async sendTokenUpdateNotification(serverId: string, newToken: string) {
    const server = this.servers.get(serverId);
    if (!server || !server.stdin) {
      throw new Error(`Server ${serverId} not found or not connected`);
    }

    const notification = {
      jsonrpc: '2.0',
      method: 'notifications/token/update',
      params: {
        token: newToken,
        timestamp: Date.now()
      }
    };

    // Send via stdin
    server.stdin.write(JSON.stringify(notification) + '\n');

    logger.debug(`Token update notification sent to server: ${serverId}`);
  }

  /**
   * Start automatic token refresh
   */
  startTokenRefreshTimer(serverId: string, intervalMs: number = 3000000) {
    // Refresh every 50 minutes (tokens expire in ~60 minutes)
    setInterval(async () => {
      try {
        await this.refreshTokenForServer(serverId);
      } catch (error) {
        logger.error(`Scheduled token refresh failed for ${serverId}:`, error);
      }
    }, intervalMs);
  }
}
```

## Benefits

1. **No Server Restart**: Token updates happen in real-time without interrupting the MCP server
2. **Seamless Experience**: Users don't experience any disconnection or downtime
3. **Standard Protocol**: Uses MCP's built-in notification mechanism
4. **Automatic Refresh**: peta-core can implement automatic token refresh timers

## Token Lifecycle

```
┌─────────────┐
│  peta-core  │
└─────────────┘
      │
      │ 1. Start server with initial token
      ├─────────────────────────────────────────────┐
      │                                             │
      │                                    ┌────────▼────────┐
      │                                    │   MCP Server    │
      │                                    │  (Docker/Node)  │
      │                                    └────────┬────────┘
      │                                             │
      │ 2. Token expires after ~60 minutes          │ 3. Tools use current token
      │                                             │
      ├─────────────────────────────────────────────┤
      │                                             │
      │ 4. Refresh token from OAuth provider        │
      │                                             │
      ├─────────────────────────────────────────────┤
      │                                             │
      │ 5. Send notification/token/update           │
      │────────────────────────────────────────────▶│
      │                                             │
      │                                    6. Update process.env.accessToken
      │                                             │
      │                                    7. Continue using new token
      │                                             │
      └─────────────────────────────────────────────┘
```

## Testing

### Manual Test

Use the provided test script:

```bash
# Set initial token
export accessToken='ya29.your_initial_token'

# Build and run
npm run build
docker build -t peta/mcp-google-drive:latest .

# Run test
./test-token-update.sh
```

### Verification

Check the server logs for these messages:

```
[Server] Token update notification handler registered
[Token] Received token update notification
[Token] Access token updated successfully
```

## Security Considerations

1. **Token Validation**: The server validates token format before updating
2. **No Storage**: Tokens are only stored in memory (`process.env`)
3. **Transport Security**: Uses STDIO transport (no network exposure)
4. **Logging**: Token is logged with prefix only (first 10 chars + "...")

## Error Handling

### Invalid Token Format

If peta-core sends an invalid token:

```typescript
// Server logs error and ignores the update
logger.error('[Token] Invalid token received in notification');
```

### Connection Lost

If the MCP server loses connection to peta-core:
- The server will continue using the last valid token
- Operations will fail when the token expires
- peta-core should restart the server with a fresh token

### Token Expired

If the token expires before refresh:
- Google Drive API calls will return 401 Unauthorized
- The error will be propagated to the user
- peta-core should catch this and immediately refresh the token

## Best Practices

1. **Refresh Before Expiry**: Refresh tokens 10 minutes before they expire (at 50 minutes)
2. **Retry Logic**: Implement retry logic for failed refresh attempts
3. **Error Notification**: Notify users if token refresh fails multiple times
4. **Monitoring**: Log all token refresh operations for debugging

## Comparison with Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| **Notification (Implemented)** | ✅ Real-time, no restart, standard | Requires notification handler |
| **Environment Variable + Restart** | Simple | ❌ Interrupts service, slow |
| **File Watching** | No restart needed | ❌ Complex, non-standard |
| **HTTP Callback** | Flexible | ❌ Requires port, security concerns |

## FAQ

### Q: Can the token be updated multiple times?
**A:** Yes, peta-core can send multiple token update notifications. Each one will update the token in memory.

### Q: What happens if a tool is running when the token updates?
**A:** The running tool will complete with the old token. New tool calls will use the updated token.

### Q: Does this work in Docker?
**A:** Yes, the notification mechanism works in both Docker and direct Node.js execution.

### Q: Can other MCP servers use this approach?
**A:** Yes! This is a generic pattern that any MCP server can implement for credential updates.

## Related Files

- `src/server.ts` - Notification handler implementation
- `src/auth/token.ts` - Token retrieval function
- `test-token-update.sh` - Test script
- `README.md` - General documentation
- `DOCKER.md` - Docker deployment guide
