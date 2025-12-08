# MCP Server Template

A complete, production-ready TypeScript MCP Server template with STDIO transport, Docker support, and best practices.

**Built with McpServer API + MCP Best Practices + PETA Integration Ready**

---

## ⚠️ Important: Read This When Creating a New Project

**If you're creating a new project based on this template, please refer to:**

📋 **[NEW_PROJECT_CHECKLIST.md](./NEW_PROJECT_CHECKLIST.md)** - New Project Creation Checklist

This checklist will guide you through:
- ✅ Modifying all necessary configuration files
- ✅ Updating project name and description
- ✅ Replacing example code with your implementation
- ✅ Ensuring log output displays correct project name
- ✅ Deleting unnecessary template files

---

## ✨ Features

- ⚡ **Modern API**: Uses McpServer high-level API for concise tool registration
- 🔌 **STDIO Transport**: Direct stdin/stdout communication for Claude Desktop and PETA Core
- 🐳 **Docker Support**: Multi-platform Docker images (amd64/arm64) with build scripts
- 🏗️ **Clean Architecture**: Simplified directory structure (tools, auth, types, utils)
- 🔷 **Complete TypeScript**: Strict type checking + Zod runtime validation
- 🚀 **Development Toolchain**: Hot reload, ESLint, Prettier, testing
- ✅ **MCP Best Practices**: camelCase naming, XML tag descriptions, detailed error handling
- 🔐 **Optional Auth Module**: Token management for OAuth/API key authentication
- 📝 **Environment Variables**: .env support, configuration management
- 🧪 **Testing Support**: Vitest testing framework (v4.0.5 - security fixed)
- 📚 **Complete Documentation**: Detailed code comments and usage documentation
- 🎯 **Production Ready**: Signal handling, error catching, logging system

---

## 📁 Project Structure

```
mcp-server-template/
├── src/
│   ├── stdio.ts            # STDIO transport entry point (main)
│   ├── server.ts           # McpServer + tool/resource registration
│   ├── auth/               # 🔐 Optional: Token management (delete if not needed)
│   │   └── README.md       # Guide on when to use/delete this module
│   ├── tools/              # Tool implementations
│   │   ├── echo.ts         # Example: echo tool
│   │   └── calculator.ts   # Example: calculator tool
│   ├── types/              # Type definitions
│   │   └── index.ts
│   └── utils/              # Utility functions
│       └── logger.ts       # Logging system (stderr)
├── tests/                  # Test files
├── dist/                   # Build output (generated)
├── Dockerfile              # Multi-stage Docker build
├── build-docker.sh         # Docker build script (multi-platform)
├── .dockerignore           # Docker build exclusions
├── package.json
├── tsconfig.json
├── .env.example
├── .eslintrc.json          # ESLint configuration
├── .prettierrc.json        # Prettier configuration
├── .gitignore
├── NEW_PROJECT_CHECKLIST.md # ⚠️ Read this first!
├── TEMPLATE_GUIDE.md       # Detailed usage guide
└── README.md
```

**Architecture Highlights**:
- ✅ Uses `McpServer` (high-level API) to simplify tool registration
- ✅ Tool registration directly in `server.ts` using `registerTool()`
- ✅ Zod schemas automatically convert to JSON Schema
- ✅ Complete type inference and automatic validation
- ✅ Resources managed through `server.setRequestHandler()`

---

## 🚀 Quick Start

### Option 1: Docker (Recommended for Production)

```bash
# Build Docker image
./build-docker.sh

# Or build multi-platform (amd64, arm64)
./build-docker.sh multi

# Run with Docker
docker run -i --rm your-org/mcp-your-server:latest
```

**Update `build-docker.sh`** before building:
```bash
IMAGE_NAME="your-org/mcp-your-server"  # Change this!
```

### Option 2: Direct Node.js (Recommended for Development)

#### 1. Install Dependencies

```bash
npm install
```

**Dependency Overview**:
- **Runtime Dependencies** (4):
  - `@modelcontextprotocol/sdk@^1.21.0` - MCP core library (latest version)
  - `dotenv` - Environment variable management
  - `zod` - Runtime type validation (auto-converts to JSON Schema)
  - `https-proxy-agent` - Proxy support (optional, for network environments)
- **Development Dependencies** (8):
  - `typescript` - TypeScript compiler
  - `tsx` - Development hot reload
  - `@types/node` - Node.js type definitions
  - `eslint` + `@typescript-eslint/*` - Code quality checking
  - `prettier` - Code formatting
  - `vitest@^4.0.5` - Testing framework (security fixed)

### 2. Configure Environment Variables

```bash
cp .env.example .env
# Edit the .env file as needed
```

### 3. Development Mode (with hot reload)

```bash
npm run dev
```

### 4. Build Project

```bash
npm run build
```

### 5. Run Production Version

```bash
npm start
```

---

## 🛠️ Available Tools

### 1. echoMessage
Echo tool that returns the message you send.

**Parameters**:
- `message` (string, required): Message to echo
- `uppercase` (boolean, optional): Convert to uppercase
- `repeat` (number, optional): Repeat count (1-10)

**Example**:
```json
{
  "name": "echoMessage",
  "arguments": {
    "message": "Hello, MCP!",
    "uppercase": true
  }
}
```

---

### 2. performCalculation
Perform basic mathematical operations.

**Parameters**:
- `operation` (string, required): Operation type (add/subtract/multiply/divide)
- `a` (number, required): First number
- `b` (number, required): Second number

**Example**:
```json
{
  "name": "performCalculation",
  "arguments": {
    "operation": "add",
    "a": 5,
    "b": 3
  }
}
```

---

## 📚 Available Resources

### template://server-info
Returns server information and implemented best practices.

### template://server-status
Returns current server runtime status, memory usage, etc.

### template://examples
Returns usage examples documentation for all tools.

---

## 🔧 Claude Desktop Configuration

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server-template/dist/index.js"],
      "env": {
        "NODE_ENV": "production"
      }
    }
  }
}
```

Or use tsx in development mode:

```json
{
  "mcpServers": {
    "my-server-dev": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-server-template/src/index.ts"],
      "env": {
        "NODE_ENV": "development"
      }
    }
  }
}
```

Restart Claude Desktop after configuration.

---

## 📝 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode (hot reload) |
| `npm run build` | Build TypeScript |
| `npm start` | Run built code |
| `npm run clean` | Clean build directory |
| `npm test` | Run tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run lint` | Check code standards |
| `npm run lint:fix` | Auto-fix code standards |
| `npm run format` | Format code |
| `npm run format:check` | Check code formatting |
| `npm run type-check` | TypeScript type checking |

---

## 🏗️ Architecture Overview

### Current Architecture: Single-File Centralized

This template uses direct tool registration in `src/server.ts`, which is the **officially recommended approach** suitable for small to medium projects (2-10 tools).

**Advantages**:
- 📖 Clear and easy to understand, all tool registration in one place
- 🚀 Fast development, suitable for prototypes and small projects
- 🔍 Simple debugging, no need to trace across files
- ✅ Follows official practices (official small servers all use this approach)

**When to Consider Evolution**?
- When tool count exceeds 10, consider modular architecture
- When team collaboration causes frequent conflicts, split tools into separate files
- When tools need to be reused across projects, consider plugin architecture

**Detailed Guide**: See [TEMPLATE_GUIDE.md](./TEMPLATE_GUIDE.md#-architecture-evolution-guide) for different architecture patterns and evolution paths.

---

## 🎨 Extending the Template

### Adding New Tools

**1. Create tool implementation** (`src/tools/mytool.ts`):

```typescript
import { z } from 'zod';
import { logger } from '../utils/logger.js';
import { createInvalidParamsError } from '../utils/errors.js';

const MyToolInput = z.object({
  param1: z.string().describe('Description of parameter 1'),
  param2: z.number().optional().describe('Description of parameter 2'),
});

export async function myTool(args: unknown): Promise<string> {
  const input = MyToolInput.parse(args);
  logger.debug(`[myTool] Processing: ${input.param1}`);

  // Input validation example
  if (input.param1.length === 0) {
    throw createInvalidParamsError('param1 cannot be empty');
  }

  // Your implementation logic
  const result = `Result: ${input.param1}`;

  return result;
}
```

**2. Register in server.ts** (`src/server.ts`):

Add to the `setupTools()` method:

```typescript
import { myTool } from './tools/mytool.js';

// Add to setupTools() method
this.server.registerTool(
  'myTool',  // Use camelCase
  {
    description: `<use_case>
Description of this tool's purpose...
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
- "Perform some operation"
- "Help me do something"
</aliases>`,
    inputSchema: {
      param1: z.string().describe('Description of parameter 1'),
      param2: z.number().optional().describe('Description of parameter 2'),
    },
  },
  async ({ param1, param2 }) => {
    logger.info(`[tools] Executing tool: myTool`);
    try {
      const result = await myTool({ param1, param2 });
      logger.debug(`[tools] Tool myTool executed successfully`);
      return {
        content: [{ type: 'text', text: result }],
      };
    } catch (error) {
      // Use standard MCP error handling
      throw handleUnknownError(error, 'myTool');
    }
  }
);
```

---

### Adding New Resources

In the `setupResources()` method of `src/server.ts`:

**1. Add to resource list** (in ListResourcesRequestSchema handler):
```typescript
{
  uri: 'myscheme://myresource',
  name: 'Resource Name',
  description: 'Resource description',
  mimeType: 'application/json',
}
```

**2. Implement read logic** (in ReadResourceRequestSchema handler's switch):
```typescript
case 'myscheme://myresource':
  return {
    contents: [{
      uri: 'myscheme://myresource',
      mimeType: 'application/json',
      text: JSON.stringify({ data: 'your data' }, null, 2),
    }],
  };
```

---

### Integrating External Services

**1. Create service layer** (`src/services/myapi.ts`):

```typescript
export class MyAPIService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchData(query: string) {
    const response = await fetch(`https://api.example.com/data?q=${query}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.statusText}`);
    }

    return response.json();
  }
}
```

**2. Use in tools**:

```typescript
import { MyAPIService } from '../services/myapi.js';

const apiService = new MyAPIService(process.env.API_KEY!);

export async function myApiTool(args: unknown): Promise<string> {
  const data = await apiService.fetchData(args.query);
  return JSON.stringify(data, null, 2);
}
```

---

## 📊 MCP Best Practices Implementation

This template implements all MCP best practices:

### ✅ 1. Tool Naming Standards

#### 1.1 Use camelCase Format
**ALWAYS use camelCase for tool names** - this is critical for better LLM tokenization:

✅ **Correct Examples**:
```typescript
// With service prefix (recommended for multi-service projects)
'notionGetPage'
'postgresExecuteQuery'
'gdriveSearch'

// Without prefix (acceptable for single-service projects)
'echoMessage'
'performCalculation'
```

❌ **Incorrect Examples**:
```typescript
'notion_get_page'      // snake_case - BAD tokenization
'postgres-execute'     // kebab-case - not supported
'GdriveSearch'         // PascalCase - avoid
'gdrive search'        // spaces - not allowed
```

**Why camelCase?**
- Better tokenization with models like GPT-4o
- Consistent with JavaScript/TypeScript conventions
- MCP specification recommendation
- Reference: [MCP Best Practices - Tool Naming](https://spec.modelcontextprotocol.io/specification/2024-11-05/architecture/best-practices/#tool-naming)

#### 1.2 Service Prefix Naming Convention

**When to add service prefix**:

1. **Multi-service projects** (RECOMMENDED):
   - Prefix helps distinguish tools from different services
   - Examples: `notionGetPage`, `postgresListSchemas`, `gdriveSearch`

2. **Single-service projects** (ACCEPTABLE):
   - Prefix optional if all tools belong to one service
   - Examples: `echoMessage`, `performCalculation`

**Breaking Change Notice**:
- If you change tool names (e.g., snake_case → camelCase), bump minor version (1.0.0 → 1.1.0)
- Add breaking change notice in README:
  ```markdown
  > **Version 1.1.0 - Breaking Change**: Tool names updated to camelCase format (e.g., `old_name` → `newName`) to follow MCP best practices for better LLM tokenization.
  ```

### ✅ 2. Tool Description Standards

#### 2.1 Use XML Tags for Structure
```typescript
server.registerTool(
  'myTool',
  {
    description: `<use_case>
Describe what this tool does and when to use it...
</use_case>

<important_notes>
- Important constraint 1
- Important constraint 2
- Security consideration
</important_notes>

<examples>
Example 1: Basic usage
Input: { "param": "value" }
Output: "result"

Example 2: Advanced usage
Input: { "param": "value", "option": true }
Output: "enhanced result"
</examples>

<aliases>
This tool can be used when users ask:
- "How do I do X?"
- "Help me with Y"
- "Perform Z operation"
</aliases>`,
    inputSchema: { /* ... */ }
  },
  async (params) => { /* ... */ }
);
```

#### 2.2 Required Sections
- `<use_case>`: Clear explanation of tool purpose and usage scenarios
- `<important_notes>`: Constraints, limitations, security notes
- `<examples>`: Concrete usage examples with inputs and outputs
- `<aliases>`: Natural language patterns that should trigger this tool

### ✅ 3. Version Management

#### 3.1 Semantic Versioning
Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes (e.g., remove tools, change behavior)
- **MINOR** (1.x.0): New features, tool name changes (backward-incompatible)
- **PATCH** (1.0.x): Bug fixes (backward-compatible)

#### 3.2 Single Source of Truth
**ALWAYS use `package.json` as the single source of truth for version**:

```typescript
// src/server.ts - Read version at runtime
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf-8')
);
const VERSION = packageJson.version;

const server = new McpServer({
  name: 'my-server',
  version: VERSION,  // Use version from package.json
});
```

```bash
# build-docker.sh - Read version for Docker tags
VERSION=$(node -p "require('./package.json').version")
docker build --build-arg VERSION=$VERSION -t myimage:$VERSION .
docker build --build-arg VERSION=$VERSION -t myimage:latest .
```

#### 3.3 Version Update Process
```bash
# Update version
npm version patch  # 1.0.0 -> 1.0.1
npm version minor  # 1.0.0 -> 1.1.0
npm version major  # 1.0.0 -> 2.0.0

# Rebuild
npm run build

# All components automatically use new version
```

### ✅ 4. Documentation Standards

#### 4.1 README Structure
Every MCP server README should include:

1. **Header**: Project name, description, version notice
2. **Features**: List all tools with descriptions
3. **Quick Start**: Installation and usage instructions
4. **Authentication**: How to configure credentials
5. **Configuration**: Environment variables, Docker setup, Claude Desktop config
6. **Available Tools**: Detailed tool documentation
7. **Development**: Build, test, lint commands
8. **Security**: Best practices, access modes
9. **License**: MIT or other

#### 4.2 Breaking Change Notice
When introducing breaking changes, add prominent notice at top of README:

```markdown
> **Version 1.1.0 - Breaking Change**: Tool names updated to camelCase format (e.g., `old_tool` → `oldTool`) to follow MCP best practices for better LLM tokenization.
```

### ✅ 5. Logging Best Practices
- All logs use `console.error()` to output to stderr
- stdout reserved for MCP protocol communication
- This is critical for STDIO transport mode

```typescript
// utils/logger.ts
export const logger = {
  info: (message: string, ...args: unknown[]) => {
    console.error(`[INFO] ${message}`, ...args);  // stderr!
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[ERROR] ${message}`, ...args); // stderr!
  },
};
```

### ✅ 6. Docker Best Practices

#### 6.1 Multi-platform Build
Support both amd64 and arm64 architectures:

```bash
# build-docker.sh
VERSION=$(node -p "require('./package.json').version")

# Local build (single platform)
docker build --build-arg VERSION=$VERSION -t myimage:latest .

# Multi-platform build (requires buildx)
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --build-arg VERSION=$VERSION \
  -t myorg/myimage:$VERSION \
  -t myorg/myimage:latest \
  --push .
```

#### 6.2 Localhost Remapping
Docker containers cannot access host's `localhost` directly. Add automatic remapping:

```bash
# docker-entrypoint.sh
#!/bin/bash
set -e

# Remap localhost to host machine
if [ "$(uname)" = "Darwin" ] || [ "$(uname)" = "Windows_NT" ]; then
  # MacOS/Windows: use host.docker.internal
  export DATABASE_URL="${DATABASE_URL//localhost/host.docker.internal}"
else
  # Linux: use Docker gateway IP
  GATEWAY_IP=$(ip route | awk '/default/ {print $3}')
  export DATABASE_URL="${DATABASE_URL//localhost/$GATEWAY_IP}"
fi

exec node dist/index.js
```

### ✅ 7. Error Handling Standards

#### 7.1 Use MCP Standard Error Codes
```typescript
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// Official error codes
ErrorCode.InvalidParams       // -32602 (most common)
ErrorCode.InternalError       // -32603
ErrorCode.MethodNotFound      // -32601
```

#### 7.2 Custom Error Codes
Use -32010 to -32099 range to avoid conflicts:

```typescript
export enum AppErrorCode {
  InvalidParams = ErrorCode.InvalidParams,  // -32602
  InternalError = ErrorCode.InternalError,  // -32603

  // Custom errors (avoid conflicts)
  ResourceNotFound = -32010,
  OperationFailed = -32011,
}
```

### ✅ 8. Input Validation Standards

Always use Zod schemas for runtime validation:

```typescript
import { z } from 'zod';

const MyToolInput = z.object({
  id: z.string().min(1).describe('Resource ID'),
  options: z.object({
    limit: z.number().int().positive().max(1000).optional(),
  }).optional(),
});

export async function myTool(args: unknown) {
  const input = MyToolInput.parse(args);  // Throws on invalid input
  // ... implementation
}
```

### ✅ 9. Testing Standards

```typescript
// tests/tools/mytool.test.ts
import { describe, it, expect } from 'vitest';
import { myTool } from '../../src/tools/mytool';

describe('myTool', () => {
  it('should handle valid input', async () => {
    const result = await myTool({ id: '123' });
    expect(result).toBeDefined();
  });

  it('should throw on invalid input', async () => {
    await expect(myTool({ id: '' })).rejects.toThrow();
  });
});
```

### ✅ 10. Security Standards

1. **Input Validation**: Validate ALL inputs with Zod schemas
2. **Environment Variables**: Store secrets in .env files (never commit)
3. **Access Control**: Implement readonly/readwrite modes when applicable
4. **Query Limits**: Set row limits, timeouts for database operations
5. **Error Messages**: Don't expose sensitive information in errors

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch
```

Test file example (`tests/tools/echo.test.ts`):

```typescript
import { describe, it, expect } from 'vitest';
import { echoTool } from '../../src/tools/echo';

describe('echoTool', () => {
  it('should echo message', async () => {
    const result = await echoTool({ message: 'test' });
    expect(result).toBe('Echo: test');
  });

  it('should uppercase message', async () => {
    const result = await echoTool({ message: 'test', uppercase: true });
    expect(result).toBe('Echo: TEST');
  });
});
```

---

## ⚠️ Error Handling Best Practices

This template uses MCP SDK official error code standards to ensure complete compatibility with the MCP protocol.

### MCP Official Error Codes

**Important Note**: Only use the officially defined `ErrorCode` enum from MCP SDK:

```typescript
import { ErrorCode } from '@modelcontextprotocol/sdk/types.js';

// MCP official error codes:
ErrorCode.ConnectionClosed   // -32000: Connection closed
ErrorCode.RequestTimeout      // -32001: Request timeout
ErrorCode.ParseError          // -32700: JSON parse error
ErrorCode.InvalidRequest      // -32600: Invalid request
ErrorCode.MethodNotFound      // -32601: Method not found
ErrorCode.InvalidParams       // -32602: Invalid parameters (most common)
ErrorCode.InternalError       // -32603: Internal error
```

### Custom Error Codes

If you need application-specific error codes, use the **-32010 to -32099** range (to avoid conflicts with official codes):

```typescript
export enum AppErrorCode {
  // Use MCP standard errors
  InvalidParams = ErrorCode.InvalidParams,  // -32602
  InternalError = ErrorCode.InternalError,  // -32603

  // Custom errors (starting from -32010)
  ResourceNotFound = -32010,
  OperationFailed = -32011,
  ValidationFailed = -32012,
}
```

### Using in Tools

```typescript
import { createInvalidParamsError, createInternalError } from '../utils/errors.js';

export async function myTool(args: unknown): Promise<string> {
  // Parameter validation failure
  if (someValue === 0) {
    throw createInvalidParamsError('Value cannot be zero');
  }

  // Internal error
  try {
    // ... operation
  } catch (error) {
    throw createInternalError('Operation failed', { error });
  }
}
```

### Why This Matters

1. **Protocol Compatibility**: MCP clients rely on standard error codes to properly handle errors
2. **Debug Friendly**: Standard error codes make problem diagnosis easier
3. **Avoid Conflicts**: Custom error codes must avoid MCP reserved ranges
4. **Best Practices**: Follow MCP specifications to ensure ecosystem compatibility

---

## 🔒 Security Considerations

- ✅ **Input Validation**: Validate all inputs using Zod schemas
- ✅ **Environment Variables**: Store sensitive information in .env files
- ✅ **Error Handling**: Use MCP standard error codes, handle errors gracefully without exposing sensitive information
- ✅ **Local Execution**: Code runs on user's machine, not transmitted to cloud
- ⚠️ **Add Authentication**: If accessing sensitive APIs, add appropriate authentication

---

## 📚 Learning Resources

- [MCP Official Documentation](https://modelcontextprotocol.io)
- [MCP Best Practices](https://github.com/lirantal/awesome-mcp-best-practices)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [MCP Specification](https://spec.modelcontextprotocol.io)

---

## 🤝 Contributing

Contributions are welcome! Feel free to submit Pull Requests.

---

## 📄 License

MIT License - Free to use and modify

---

## 💡 Extension Ideas

Based on this template, you can build:

- **API Integration Servers**: Connect REST APIs, GraphQL, databases
- **File Operation Servers**: Read/write files, search directories, file analysis
- **Data Processing Servers**: Parse CSV/JSON/XML, data transformation
- **Code Analysis Servers**: Analyze code structure, find patterns, refactoring suggestions
- **Web Scraping Servers**: Fetch and parse web content
- **System Information Servers**: Get system status, process information
- **AI Integration Servers**: Call other AI services, process AI outputs

---

**Happy building with MCP Server!** 🚀
