# New Project Creation Checklist

When creating a new project based on this template, please update all relevant content according to this checklist.

---

## 🔍 Optional Modules - Decide What to Keep

Before modifying files, determine which optional modules your project needs:

### ✅ Keep `src/auth/` if:
- Your MCP server requires OAuth access tokens (Google, Figma, Notion, etc.)
- You need API keys or personal access tokens
- Token needs to be updated dynamically at runtime

### ❌ Delete `src/auth/` if:
- Your server uses database connection strings (PostgreSQL, MySQL, etc.)
- No external API authentication required
- Only static configuration needed

**Examples:**
- ✅ Keep: Google Drive, Figma, Notion (OAuth tokens)
- ❌ Delete: PostgreSQL (connection string), File system access

---

## ⚠️ Files That Must Be Modified

### 1. package.json

```json
{
  "name": "your-new-project-name",  // ← Change project name
  "version": "1.0.0",
  "description": "Your project description",  // ← Change description
  "bin": {
    "your-new-project-name": "./dist/stdio.js"  // ← Change command name
  },
  "keywords": [
    "mcp",
    "your-keywords"  // ← Change keywords
  ]
}
```

### 2. build-docker.sh

Update Docker image name:

```bash
# Configuration - CUSTOMIZE THESE FOR YOUR PROJECT
IMAGE_NAME="ghcr.io/dunialabs/mcp-servers/your-server"  // ← Change to your GHCR image name
```

**Example:**
- `ghcr.io/dunialabs/mcp-servers/figma` for Figma MCP Server
- `ghcr.io/dunialabs/mcp-servers/notion` for Notion MCP Server

### 3. src/stdio.ts

Modify startup logs and description:

```typescript
async function main() {
  logger.info('='.repeat(60));
  logger.info('🚀 Starting Your Project Name (STDIO)');  // ← Change project name
  logger.info('='.repeat(60));

  try {
    const server = new MCPServer({
      name: process.env.SERVER_NAME || 'your-project',  // ← Change default name
      version: getVersion(),  // ← Read from package.json (single source of truth)
      description: 'Your project description',  // ← Change description
    });

    await server.start();

    logger.info('✅ MCP Server is ready and listening on STDIO');
  }
}
```

### 4. src/server.ts

Modify SERVER_INSTRUCTIONS:

```typescript
const SERVER_INSTRUCTIONS = `
This is Your Project Name that does XYZ.  // ← Change project description

## Purpose
Describe what your server does...  // ← Change purpose description

## Available Tools

### 1. yourTool1
Description...  // ← Change tool description

## Important Notes
...  // ← Change important notes

## Best Practices
...  // ← Change best practices
`;
```

### 4. .env.example

```bash
# Server Configuration
SERVER_NAME=your-project-name  # ← Change project name

# Your specific environment variables
YOUR_API_KEY=your_api_key_here  # ← Add your environment variables
```

### 5. README.md

- Project title
- Project description
- Features
- Tool documentation
- Usage examples
- Claude Desktop configuration paths
- OAuth scopes grouped by category (`Required` vs `Optional`)
- Admin-consent prerequisite (if provider requires tenant admin approval)
- If MCP Apps are added:
  - document the chosen header/body/footer reference structure
  - document light/dark theme behavior
  - document whether header accent color is intentionally different from action-link color

### 6. Dockerfile (if using)

```dockerfile
LABEL maintainer="Your Project Name"
LABEL description="Your project description"  # ← Change description
LABEL version="1.0.0"
```

---

## 🔧 Files to Delete

After copying from the template, delete these example files:

```bash
# Delete example tools
rm src/tools/echo.ts
rm src/tools/calculator.ts

# Delete example tests
rm tests/tools/echo.test.ts
rm tests/tools/calculator.test.ts

# Delete template documentation
rm TEMPLATE_GUIDE.md
rm NEW_PROJECT_CHECKLIST.md  # (this file, delete after completing checklist)
```

---

## ➕ Files to Create

### 1. Create Your Tools

```bash
# src/tools/your-tool.ts
```

Example:
```typescript
import { z } from 'zod';
import { logger } from '../utils/logger.js';

const YourToolInput = z.object({
  param1: z.string().describe('Parameter description'),
});

export async function yourTool(args: unknown): Promise<string> {
  const input = YourToolInput.parse(args);
  logger.debug(`[yourTool] Processing: ${input.param1}`);

  // Your implementation
  return `Result: ${input.param1}`;
}
```

### 2. Register Tools

In the `setupTools()` method of `src/server.ts`:

```typescript
import { yourTool } from './tools/your-tool.js';

// Add to setupTools() method
this.server.registerTool(
  'yourServiceYourToolName',  // camelCase + stable service prefix
  {
    description: `<use_case>
Use this tool to...
</use_case>

<important_notes>
- Important note 1
- Important note 2
</important_notes>

<examples>
Example 1: Simple usage
Input: { "param1": "test" }
Output: "Result: test"
</examples>

<aliases>
This tool can be used when users ask:
- "Do something"
- "Perform action"
</aliases>`,
    inputSchema: {
      param1: z.string().describe('Parameter description'),
    },
  },
  async ({ param1 }) => {
    logger.info(`[tools] Executing tool: yourToolName`);
    try {
      const result = await yourTool({ param1 });
      logger.debug(`[tools] Tool yourToolName executed successfully`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`[tools] Error executing tool yourToolName:`, errorMessage);
      return {
        content: [{
          type: 'text',
          text: `Unable to execute tool "yourToolName".\n\nError: ${errorMessage}\n\nPlease check the tool description for correct usage and try again.`,
        }],
        isError: true,
      };
    }
  }
);
```

### 4. If You Add MCP Apps Views

Before shipping a view, verify:

- header has only one primary title block
- refresh/action controls align with the last header row
- there is no duplicated metadata between header and secondary summary cards
- light mode uses branded tint mainly in the shell, not the full content area
- dark mode uses neutral content panels for readability
- action links are visually distinct from header/chip accents

This is a reference checklist, not a requirement that every view share the exact same layout.
Color tokens are also reference defaults. It is acceptable to choose a different accent family or add more complex layout sections if the tool benefits from it.
- verify density is appropriate for the tool type (browser/table/tree vs reader/detail)
- verify empty and error states are explicit and not overly generic
- verify the view still works reasonably under common host limitations

### 3. Create Tests

```bash
# tests/tools/your-tool.test.ts
```

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { yourTool } from '../../src/tools/your-tool.js';

describe('yourTool', () => {
  it('should process input correctly', async () => {
    const result = await yourTool({ param1: 'test' });
    expect(result).toBe('Result: test');
  });
});
```

---

## ✅ Complete Checklist

Copy this checklist and check each item:

### Configuration Files
- [ ] `package.json` - Project name, description, keywords
- [ ] `.env.example` - Environment variable names
- [ ] `tsconfig.json` - (usually no changes needed)

### Source Code
- [ ] `src/stdio.ts` - Startup logs and project description (primary entry point)
- [ ] `src/index.ts` - Startup logs and project description (secondary entry point, can delete if unused)
- [ ] `src/server.ts` - SERVER_INSTRUCTIONS, tool registration, and optional `notifications/token/update` handler
- [ ] `src/types/index.ts` - Add your type definitions
- [ ] `src/tools/` - Delete example tools, create your tool implementations
- [ ] `src/utils/` - Add your utility functions
- [ ] Token update precedence is consistent: `accessToken ?? token`
- [ ] API auth errors mapped correctly (`AuthenticationFailed` for token issues, `PermissionDenied` for scope)
- [ ] Error strategy is chosen explicitly and documented:
  - repository-standard `McpError` codes for connector/API failures, or
  - `isError: true` for presentation-only tool failures
- [ ] Pagination params match endpoint contract (cursor vs offset/start)

### Tests
- [ ] `tests/tools/` - Replace template sample tests with your project tests

### Documentation
- [ ] `README.md` - Completely update with your project documentation
- [ ] Tool names and counts are consistent between README and `src/server.ts`
- [ ] Delete `TEMPLATE_GUIDE.md`
- [ ] Delete `NEW_PROJECT_CHECKLIST.md` (this file)

### Docker (if using)
- [ ] `Dockerfile` - Update labels and description
- [ ] `.dockerignore` - Check if adjustments are needed

### Build and Test
- [ ] `npm install` - Install dependencies
- [ ] `npm run build` - Build successfully
- [ ] `npm test` - Tests pass
- [ ] `npm start` - Run successfully
- [ ] Log output is correct (displays your project name)
- [ ] Smoke test all tools at least once with a real token in `.env`

---

## 🎯 Verification Steps

### 1. Check Log Output

Run `npm start`, you should see:

```
[INFO] ============================================================
[INFO] 🎯 Starting Your Project Name  // ← Your project name
[INFO] ============================================================
[INFO] [server] Initializing your-project v1.0.0  // ← Your project name
```

### 2. Check Tool Registration

The logs should display:
```
[INFO] ✅ Your server is ready
[INFO] 📍 Available tools: yourTool1, yourTool2  // ← Your tools
```

### 3. Test Claude Desktop Configuration

```json
{
  "mcpServers": {
    "your-project": {  // ← Your project name
      "command": "node",
      "args": ["/absolute/path/to/your-project/dist/stdio.js"]
    }
  }
}
```

### 4. Release Verification (GHCR Workflow)

- [ ] `package.json` version matches release tag version
- [ ] Tag format is `mcp-<project>-vX.Y.Z`
- [ ] Push tag triggers `.github/workflows/publish-mcp-package.yml`
- [ ] Verify GHCR has both `:<version>` and `:latest`

---

## 📝 Example: From Template to new-weather

Using the new-weather project as an example:

### Modifications Made
- `package.json`: name changed to "new-weather-mcp-server"
- `src/stdio.ts`: logs changed to "Starting New Weather MCP Server"
- `src/server.ts`:
  - SERVER_INSTRUCTIONS changed to weather-related description
  - In setupTools(), deleted example tools, registered weather tools
- Deleted: `src/tools/echo.ts`, `src/tools/calculator.ts`
- Created: `src/tools/alerts.ts`, `src/tools/forecast.ts`, `src/services/nws-api.ts`
- Updated: `types/index.ts` with weather-related types

### Result
✅ Clear weather server logs
✅ Correct tool descriptions (using registerTool)
✅ Appropriate documentation for weather service

---

## 💡 Tips

1. **Search and Replace**: Use your IDE's search feature to find "template" or "Template" to ensure nothing is missed
2. **Progressive Modification**: First modify configuration, then code, finally documentation
3. **Test Frequently**: After each modification, run `npm run build` and `npm start` to verify
4. **Check Logs**: Ensure all log outputs display your project name with no "template" references

---

**Once you complete this checklist, you'll have a fully customized MCP server project!** 🚀
