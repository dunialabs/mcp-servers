# Authentication Module (Optional)

This directory contains authentication-related code for MCP servers that require API tokens or OAuth authentication.

## When to Use This Module

**Use the `auth/` module if your MCP server needs:**
- OAuth access tokens (e.g., Google APIs, Figma, Notion)
- API keys or personal access tokens
- Dynamic token refresh functionality
- Token validation

**Delete this directory if your MCP server:**
- Connects to databases using connection strings (e.g., PostgreSQL, MySQL)
- Accesses local file systems
- Doesn't require external API authentication
- Uses static configuration only

## Implementation

The actual implementation is in `auth/token.ts`. It exports:

- `TokenValidationError` — thrown when token is missing or invalid (caught by retry utilities)
- `validateTokenFormat(token)` — returns `true` if the token passes basic format checks
- `getCurrentToken()` — reads `process.env.accessToken`, strips `"Bearer "` prefix, validates, and returns the raw token string

## Integration with Server

In your `server.ts`, register a notification handler so PETA Core can push a new token at runtime.
Use a Zod schema for type-safe parsing:

```typescript
import { z } from 'zod';
import { validateTokenFormat } from './auth/token.js';
import { logger } from './utils/logger.js';

// Inside initialize() or the constructor, after creating this.server:
const tokenUpdateSchema = z
  .object({
    method: z.literal('notifications/token/update'),
    params: z
      .object({
        accessToken: z.string().optional(),
        token: z.string().optional(),
        timestamp: z.number().optional(),
      })
      .catchall(z.unknown()),
  })
  .catchall(z.unknown());

type TokenUpdateNotification = z.infer<typeof tokenUpdateSchema>;

this.server.server.setNotificationHandler(
  tokenUpdateSchema,
  async (notification: TokenUpdateNotification) => {
    const newToken =
      notification?.params?.accessToken ?? notification?.params?.token;

    if (!newToken || typeof newToken !== 'string' || newToken.trim().length === 0) {
      logger.error('[Token] Invalid token in notifications/token/update');
      return;
    }

    if (!validateTokenFormat(newToken)) {
      logger.error('[Token] Invalid token format in notifications/token/update');
      return;
    }

    process.env.accessToken = newToken.startsWith('Bearer ')
      ? newToken.slice(7).trim()
      : newToken.trim();
    logger.info('[Token] accessToken updated via notification');
  }
);
```

The template `src/server.ts` already includes this handler by default. Keep it for OAuth/API projects, or remove it if your server does not use token auth.

**Notes:**
- `accessToken` is checked before `token` (preferred field name)
- Both field names are supported for backwards compatibility
- The handler uses `this.server.server.setNotificationHandler` (low-level server on the McpServer instance)

## Examples from Real Projects

### OAuth-based Projects (Keep auth/)
- **mcp-figma**: Uses `accessToken` for Figma OAuth
- **mcp-google-drive**: Uses `accessToken` for Google OAuth
- **mcp-notion**: Uses `notionToken` for Notion integration

### Database Projects (Delete auth/)
- **mcp-postgres**: Uses `POSTGRES_URL` connection string, no token module needed

## Environment Variable Naming

Choose a descriptive environment variable name:
- `accessToken` - for OAuth access tokens
- `apiKey` - for API keys
- `${SERVICE}Token` - for service-specific tokens (e.g., `notionToken`, `figmaToken`)

Update `.env.example` accordingly:
```bash
# API Authentication (if needed)
accessToken=your_api_token_here
```

## Summary

✅ **Keep this directory if**: Your server needs API authentication with dynamic token updates

❌ **Delete this directory if**: Your server uses connection strings or doesn't need authentication
