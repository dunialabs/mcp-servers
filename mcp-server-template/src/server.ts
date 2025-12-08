/**
 * MCP Server Implementation
 *
 * Built with McpServer (high-level API) for clean, type-safe tool and resource management.
 * Implements server-level instructions (Best Practice 2.1)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { echoTool } from './tools/echo.js';
import { calculatorTool } from './tools/calculator.js';
import { logger } from './utils/logger.js';
import { handleUnknownError } from './utils/errors.js';
import type { ServerConfig } from './types/index.js';

/**
 * Server-level instructions for LLMs (Best Practice 2.1)
 * Provides comprehensive guidance about capabilities and limitations
 */
const SERVER_INSTRUCTIONS = `
This is an MCP Server Template demonstrating best practices for building Model Context Protocol servers.

## Purpose
This template provides a complete, production-ready foundation for building MCP servers with:
- Modern McpServer API with simplified tool/resource registration
- Full TypeScript support with strict typing and Zod validation
- Development tools (hot reload, linting, testing)
- MCP best practices implementation

## Available Tools

### 1. echoMessage
Echoes back any message with optional transformations.
- Parameters: message (required), uppercase (optional), repeat (optional)
- Use cases: Testing connectivity, debugging, message validation
- Maximum message length: 10,000 characters

### 2. performCalculation
Performs basic mathematical operations.
- Parameters: operation (add/subtract/multiply/divide), a (number), b (number)
- Supports decimal numbers
- Error handling for division by zero

## Available Resources

### template://server-info
Returns JSON information about this server template including features and best practices implemented.

### template://server-status
Returns JSON with current server runtime status, memory usage, and health information.

### template://examples
Returns markdown documentation with usage examples for all available tools and resources.

## Best Practices Implemented

1. **Tool Naming (1.1)**: All tools use camelCase (e.g., echoMessage, not echo_message)
2. **Tool Aliases (1.2)**: Tool descriptions include <aliases> sections with common user queries
3. **Rich Descriptions (1.3)**: XML-tagged descriptions with <use_case>, <important_notes>, <examples>
4. **Helpful Errors (1.4)**: Detailed error messages with context, not just "not found"
5. **Server Instructions (2.1)**: This comprehensive guidance for LLM understanding
6. **Logging**: All logs use stderr to avoid polluting stdout (required for STDIO transport)
7. **Modern API**: Uses McpServer for clean, type-safe code

## Geographic/Service Limitations
None - this is a template server that works anywhere.

## Usage Tips
- Use echoMessage to test server connectivity and verify MCP communication
- Use performCalculation as an example of tools with validation and error handling
- Check template://examples resource for detailed usage examples
- Review source code in tools/ directory to understand implementation patterns

## Development
This template uses a clean architecture:
- src/server.ts - Tool and resource registration with McpServer
- src/tools/ - Individual tool implementations
- src/types/ - TypeScript type definitions
- src/utils/ - Utility functions (logging, etc.)

## Extension
To add new functionality:
1. Create tool implementation in src/tools/
2. Register tool in src/server.ts using server.registerTool()
3. Register resources using server.registerResource() if needed
4. Update this SERVER_INSTRUCTIONS if adding major features
`;

export class MCPServer {
  private server: McpServer;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;

    logger.info(`[server] Initializing ${config.name} v${config.version}`);

    this.server = new McpServer(
      {
        name: config.name,
        version: config.version,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    this.setupTools();
    this.setupResources();
  }

  private setupTools() {
    logger.debug('[server] Setting up tools...');

    // Register echoMessage tool
    this.server.registerTool(
      'echoMessage',
      {
        description: `<use_case>
Use this tool to echo back any message. Useful for testing server connectivity and verifying the MCP communication is working correctly.
</use_case>

<important_notes>
- Maximum message length: 10,000 characters
- Can optionally convert to uppercase
- Can repeat the message up to 10 times
- Useful for debugging and testing purposes
</important_notes>

<examples>
Example 1: Simple echo
Input: { "message": "Hello, MCP!" }
Output: "Echo: Hello, MCP!"

Example 2: Uppercase echo
Input: { "message": "test", "uppercase": true }
Output: "Echo: TEST"

Example 3: Repeat message
Input: { "message": "Hi", "repeat": 3 }
Output: "Echo: Hi\\nHi\\nHi"
</examples>

<aliases>
This tool can be used when users ask:
- "Can you echo this message?"
- "Test the server"
- "Repeat what I said"
- "Is the MCP server working?"
</aliases>`,
        inputSchema: {
          message: z.string().min(1).max(10000).describe('The message to echo back'),
          uppercase: z.boolean().optional().default(false).describe('Convert to uppercase'),
          repeat: z
            .number()
            .int()
            .min(1)
            .max(10)
            .optional()
            .default(1)
            .describe('Number of times to repeat (1-10)'),
        },
      },
      async ({ message, uppercase, repeat }) => {
        logger.info(`[tools] Executing tool: echoMessage`);
        try {
          const result = await echoTool({ message, uppercase, repeat });
          logger.debug(`[tools] Tool echoMessage executed successfully`);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          // Convert to MCP error and re-throw (SDK will handle it properly)
          throw handleUnknownError(error, 'echoMessage tool');
        }
      }
    );

    // Register performCalculation tool
    this.server.registerTool(
      'performCalculation',
      {
        description: `<use_case>
Use this tool to perform basic mathematical calculations. Supports addition, subtraction, multiplication, and division.
</use_case>

<important_notes>
- Supports positive and negative numbers
- Supports decimal (floating-point) numbers
- Division by zero will return an error
- Maximum safe integer: ±9,007,199,254,740,991
</important_notes>

<examples>
Example 1: Addition
Input: { "operation": "add", "a": 5, "b": 3 }
Output: "5 + 3 = 8"

Example 2: Division
Input: { "operation": "divide", "a": 10, "b": 2 }
Output: "10 ÷ 2 = 5"

Example 3: Decimal numbers
Input: { "operation": "multiply", "a": 3.14, "b": 2 }
Output: "3.14 × 2 = 6.28"
</examples>

<aliases>
This tool can be used when users ask:
- "Calculate [a] [operation] [b]"
- "What is [a] plus/minus/times/divided by [b]?"
- "Add these numbers"
- "Perform this math operation"
</aliases>`,
        inputSchema: {
          operation: z
            .enum(['add', 'subtract', 'multiply', 'divide'])
            .describe('Mathematical operation to perform'),
          a: z.number().describe('First number'),
          b: z.number().describe('Second number'),
        },
      },
      async ({ operation, a, b }) => {
        logger.info(`[tools] Executing tool: performCalculation`);
        try {
          const result = await calculatorTool({ operation, a, b });
          logger.debug(`[tools] Tool performCalculation executed successfully`);
          return {
            content: [
              {
                type: 'text',
                text: result,
              },
            ],
          };
        } catch (error) {
          // Convert to MCP error and re-throw (SDK will handle it properly)
          throw handleUnknownError(error, 'performCalculation tool');
        }
      }
    );

    logger.info('[tools] Tool handlers registered');
  }

  private setupResources() {
    logger.debug('[server] Setting up resources...');

    // Register resource list handler
    this.server.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      logger.debug('[resources] Listing available resources');
      return {
        resources: [
          {
            uri: 'template://server-info',
            name: 'Server Information',
            description: 'Information about this MCP server template',
            mimeType: 'application/json',
          },
          {
            uri: 'template://server-status',
            name: 'Server Status',
            description: 'Current server runtime status and health information',
            mimeType: 'application/json',
          },
          {
            uri: 'template://examples',
            name: 'Usage Examples',
            description: 'Examples of how to use the available tools',
            mimeType: 'text/markdown',
          },
        ],
      };
    });

    // Register resource read handler
    this.server.server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
      const { uri } = request.params;
      logger.info(`[resources] Reading resource: ${uri}`);

      try {
        switch (uri) {
          case 'template://server-info':
            return {
              contents: [
                {
                  uri: 'template://server-info',
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    {
                      name: 'MCP Server Template',
                      version: '1.0.0',
                      description: 'A complete TypeScript MCP server template',
                      environment: process.env.NODE_ENV || 'development',
                      features: {
                        tools: ['echoMessage', 'performCalculation'],
                        resources: ['server-info', 'server-status', 'examples'],
                        logging: true,
                        errorHandling: true,
                        typeValidation: true,
                      },
                      bestPractices: {
                        camelCaseNaming: true,
                        richDescriptions: true,
                        serverInstructions: true,
                        errorMessages: true,
                        stderrLogging: true,
                        mcpServerAPI: true,
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            };

          case 'template://server-status':
            return {
              contents: [
                {
                  uri: 'template://server-status',
                  mimeType: 'application/json',
                  text: JSON.stringify(
                    {
                      status: 'healthy',
                      uptime: process.uptime(),
                      memory: {
                        rss: `${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB`,
                        heapTotal: `${Math.round(process.memoryUsage().heapTotal / 1024 / 1024)} MB`,
                        heapUsed: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)} MB`,
                      },
                      process: {
                        pid: process.pid,
                        platform: process.platform,
                        nodeVersion: process.version,
                      },
                      timestamp: new Date().toISOString(),
                    },
                    null,
                    2
                  ),
                },
              ],
            };

          case 'template://examples':
            return {
              contents: [
                {
                  uri: 'template://examples',
                  mimeType: 'text/markdown',
                  text: `# MCP Server Template - Usage Examples

## Tool: echoMessage

### Example 1: Simple echo
\`\`\`json
{
  "name": "echoMessage",
  "arguments": {
    "message": "Hello, MCP!"
  }
}
\`\`\`
**Output:** "Echo: Hello, MCP!"

### Example 2: Uppercase conversion
\`\`\`json
{
  "name": "echoMessage",
  "arguments": {
    "message": "test message",
    "uppercase": true
  }
}
\`\`\`
**Output:** "Echo: TEST MESSAGE"

### Example 3: Repeat message
\`\`\`json
{
  "name": "echoMessage",
  "arguments": {
    "message": "Hi",
    "repeat": 3
  }
}
\`\`\`
**Output:** "Echo: Hi\\nHi\\nHi"

---

## Tool: performCalculation

### Example 1: Addition
\`\`\`json
{
  "name": "performCalculation",
  "arguments": {
    "operation": "add",
    "a": 42,
    "b": 8
  }
}
\`\`\`
**Output:** "42 + 8 = 50"

### Example 2: Division
\`\`\`json
{
  "name": "performCalculation",
  "arguments": {
    "operation": "divide",
    "a": 100,
    "b": 4
  }
}
\`\`\`
**Output:** "100 ÷ 4 = 25"

### Example 3: Decimal multiplication
\`\`\`json
{
  "name": "performCalculation",
  "arguments": {
    "operation": "multiply",
    "a": 3.14,
    "b": 2
  }
}
\`\`\`
**Output:** "3.14 × 2 = 6.28"

---

## Resources

### Get server information
\`\`\`
Resource URI: template://server-info
\`\`\`

### Get server status
\`\`\`
Resource URI: template://server-status
\`\`\`

### Get this examples document
\`\`\`
Resource URI: template://examples
\`\`\`
`,
                },
              ],
            };

          default:
            logger.warn(`[resources] Unknown resource requested: ${uri}`);
            return {
              contents: [
                {
                  uri,
                  mimeType: 'text/plain',
                  text: `The resource "${uri}" is not available.

Available resources:
- template://server-info - Server information
- template://server-status - Current server status
- template://examples - Usage examples

Please use one of the available resource URIs.`,
                },
              ],
            };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`[resources] Error reading resource ${uri}:`, errorMessage);
        throw error;
      }
    });

    logger.info('[resources] Resource handlers registered');
  }

  async start() {
    const transport = new StdioServerTransport();

    logger.info('[server] Connecting to STDIO transport...');

    // Global error handler
    this.server.server.onerror = (error) => {
      logger.error('[server] Server error:', error);
    };

    try {
      await this.server.connect(transport);
      logger.info(`[server] ${this.config.name} v${this.config.version} running on stdio`);
      logger.info('[server] Server started successfully');
    } catch (error) {
      logger.error('[server] Failed to start server:', error);
      throw error;
    }
  }
}
