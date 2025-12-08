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

## Example: Token Management

Here's a simple token management module (`auth/token.ts`):

```typescript
/**
 * Token Management Module
 *
 * This module handles API token retrieval and validation.
 * The token can be updated at runtime via MCP notifications.
 */

import { logger } from '../utils/logger.js';

/**
 * Get the current API token from environment
 *
 * Token update flow:
 * 1. PETA Core sends notification with new token
 * 2. server.ts updates process.env.apiToken
 * 3. This function reads from process.env.apiToken
 */
export function getToken(): string {
  const token = process.env.apiToken;

  if (!token) {
    throw new Error(
      'API token not found. Please set the apiToken environment variable.'
    );
  }

  return token;
}

/**
 * Validate token format (optional)
 */
export function validateToken(token: string): boolean {
  // Add your token validation logic here
  // Example: check prefix, length, format
  if (!token || token.length < 10) {
    logger.warn('Invalid token format');
    return false;
  }

  return true;
}
```

## Integration with Server

In your `server.ts`, handle token updates via MCP notifications:

```typescript
// Register notification handler for token updates
this.server.setNotificationHandler(
  'notifications/token/update',
  async (notification: any) => {
    const newToken = notification.params?.token;
    if (newToken) {
      process.env.apiToken = newToken;
      logger.info('Token updated successfully');
    }
  }
);
```

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
apiToken=your_api_token_here
```

## Summary

✅ **Keep this directory if**: Your server needs API authentication with dynamic token updates

❌ **Delete this directory if**: Your server uses connection strings or doesn't need authentication
