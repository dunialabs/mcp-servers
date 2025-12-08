# MCP REST Gateway

Convert REST APIs to MCP tools through simple JSON configuration.

## 🎯 Features

- **Configuration-Driven**: Define REST APIs and tools via JSON
- **Multiple Auth Methods**: Bearer, API Key (query/header), Basic Auth
- **Parameter Mapping**: Map MCP arguments to query/body/path/header parameters
- **Response Transformation**: JSONPath extraction and template formatting
- **Security First**: HTTPS-only, configurable limits, automatic log sanitization
- **STDIO Transport**: Compatible with PETA Core and Claude Desktop

## 📦 Installation

```bash
npm install
npm run build
```

## 🚀 Quick Start

### 1. Test with JSONPlaceholder (No API Key Required)

```bash
# Copy example configuration (uses JSONPlaceholder)
cp .env.example .env

# Start the server
npm start
```

### 2. Configure Your Own API

Create a `.env` file or set `GATEWAY_CONFIG` environment variable:

```bash
export GATEWAY_CONFIG='{
  "apis": [{
    "name": "my-api",
    "description": "My API service",
    "baseUrl": "https://api.example.com",
    "auth": {
      "type": "bearer",
      "value": "${API_KEY}"
    },
    "tools": [{
      "name": "myTool",
      "description": "My API tool",
      "endpoint": "/endpoint",
      "method": "GET",
      "parameters": [{
        "name": "param",
        "description": "Parameter description",
        "type": "string",
        "required": true,
        "location": "query"
      }],
      "response": {
        "type": "json"
      }
    }]
  }]
}'

export API_KEY=your_api_key_here
```

## 📝 Configuration Reference

### Configuration Structure

```typescript
{
  "apis": [{
    "name": string,              // API identifier
    "description": string,       // API description
    "baseUrl": string,          // Base URL (HTTPS only)
    "auth": AuthConfig,         // Authentication configuration
    "tools": ToolDefinition[],  // Array of tool definitions
    "headers": object,          // Optional default headers
    "timeout": number           // Optional timeout in ms
  }]
}
```

### Authentication Types

- **`none`**: No authentication
- **`bearer`**: Bearer token in Authorization header
  ```json
  { "type": "bearer", "value": "${TOKEN}" }
  ```
- **`query_param`**: API key in query string
  ```json
  { "type": "query_param", "param": "key", "value": "${API_KEY}" }
  ```
- **`header`**: Custom header
  ```json
  { "type": "header", "header": "X-API-Key", "value": "${API_KEY}" }
  ```
- **`basic`**: Basic authentication
  ```json
  { "type": "basic", "username": "user", "password": "${PASSWORD}" }
  ```

### Parameter Locations

- **`path`**: URL path parameter (e.g., `/users/{id}`)
- **`query`**: Query string parameter
- **`body`**: Request body field (for POST/PUT/PATCH)
- **`header`**: HTTP header

### Response Transformation

```json
{
  "type": "json",              // json, text, or raw
  "jsonPath": "$.data.items",  // Extract specific field
  "template": "Result: {{field}}"  // Format with template
}
```

### Configuration Limits

- Maximum config size: 30KB
- Maximum tools: 20
- Maximum parameters per tool: 20
- Maximum response size: 1MB

## 🖥️ Integration

### PETA Core Integration

The REST Gateway is fully compatible with PETA Core's MCP server management system.

**Add to PETA Core:**

1. **Using PETA Core CLI**:
   ```bash
   # Add the gateway to PETA Core
   peta add mcp-rest-gateway /absolute/path/to/mcp-rest-gateway

   # Configure environment variables
   peta config mcp-rest-gateway set GATEWAY_CONFIG '{"apis":[...]}'

   # Start the gateway
   peta start mcp-rest-gateway
   ```

2. **Direct Configuration**:

   Edit your PETA Core configuration file and add:
   ```json
   {
     "servers": {
       "mcp-rest-gateway": {
         "type": "stdio",
         "command": "node",
         "args": ["/absolute/path/to/mcp-rest-gateway/dist/stdio.js"],
         "env": {
           "GATEWAY_CONFIG": "{...your config...}",
           "LOG_LEVEL": "INFO"
         }
       }
     }
   }
   ```

### Claude Desktop Integration

### Option A: Using Startup Script (Recommended)

1. **Create your configuration file**:
   ```bash
   # Copy example and customize
   cp .env.example .env
   # Edit .env with your API configurations
   ```

2. **Ensure the startup script exists and is executable**:
   ```bash
   chmod +x start-claude.sh
   ```

3. **Add to Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "rest-gateway": {
         "command": "/absolute/path/to/mcp-rest-gateway/start-claude.sh"
       }
     }
   }
   ```

   The script will automatically load `.env` if it exists, or fall back to `.env.test` for testing.

   You can also specify a custom env file:
   ```json
   {
     "mcpServers": {
       "rest-gateway": {
         "command": "/absolute/path/to/mcp-rest-gateway/start-claude.sh",
         "args": [".env.custom"]
       }
     }
   }
   ```

4. **Completely quit and restart Claude Desktop** (Cmd+Q, then reopen)

### Option B: Direct Configuration

```json
{
  "mcpServers": {
    "rest-gateway": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-rest-gateway/dist/stdio.js"],
      "env": {
        "GATEWAY_CONFIG": "{...your config...}",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

### Testing in Claude Desktop

After configuration, test in Claude:
```
Use the getTodo tool to get the todo with ID 1
```

Or:
```
Use the listTodos tool to list 5 todos
```

### Troubleshooting

**Tools not showing up:**
1. Verify config file path is correct
2. Check JSON format (use https://jsonlint.com)
3. Completely quit Claude Desktop (not just close window)
4. Check logs: `~/Library/Logs/Claude/mcp*.log`

**Tool execution fails:**
1. Run `npm run build` to ensure code is compiled
2. Test startup script manually: `./start-claude.sh`
3. Check API credentials in `.env` file

## 🧪 Example: JSONPlaceholder API

See `.env.test` for a complete working example that uses JSONPlaceholder API (no API key required).

**Available tools:**
- `getTodo` - Get a todo item by ID
- `listTodos` - List todos with optional limit

**Usage:**
```bash
cp .env.test .env
./start-claude.sh
```

## 🧰 OpenAPI Draft Generator (Experimental)

Use the bundled CLI to convert an OpenAPI/Swagger document into a Gateway draft:

```bash
# Generate from a local file
npm run draft:openapi -- --file ./openapi.json --out ./gateway-draft.json

# Or pass raw JSON inline
npm run draft:openapi -- --inline '{"openapi":"3.0.3", ... }'

# Provide a base URL when the spec has no servers.url
npm run draft:openapi -- --file ./openapi.json --base-url https://api.example.com
```

The script scans every REST method under `paths`, builds tool names, parameters (path/query/body/header), and sample responses, then emits a GatewayConfig-style draft JSON. Paste the output into the Console’s JSON editor, tweak as needed, and save it as a formal configuration.

## 🐳 Docker Support

### Build Docker Image

**Important**: You must build the TypeScript code before building the Docker image:

```bash
# Build TypeScript first
npm run build

# Then build Docker image
npm run docker:build                # Local build (current platform)
npm run docker:build:multi          # Multi-platform (linux/amd64, linux/arm64)
npm run docker:push                 # Build multi-platform and push to registry
npm run docker:clean                # Clean up buildx builder

# Or use the script directly
./build-docker.sh                   # Local build
./build-docker.sh multi             # Multi-platform build
./build-docker.sh push              # Build and push
./build-docker.sh clean             # Clean up
```

### Run with Docker

```bash
docker run -i \
  -e GATEWAY_CONFIG='{"apis":[...]}' \
  -e LOG_LEVEL=INFO \
  mcp-rest-gateway
```

### Use with PETA Core (Docker)

Add to your PETA Core configuration:

```json
{
  "servers": {
    "mcp-rest-gateway": {
      "type": "docker",
      "image": "mcp-rest-gateway:latest",
      "env": {
        "GATEWAY_CONFIG": "{...}",
        "LOG_LEVEL": "INFO"
      }
    }
  }
}
```

## 🔒 Security Features

### 1. HTTPS-Only
All API base URLs must use HTTPS. HTTP and localhost URLs are blocked.

### 2. Log Sanitization
Automatically redacts sensitive headers (Authorization, API keys, tokens) in logs.

### 3. Environment Variable Resolution
Supports `${VAR_NAME}` placeholders for secure credential injection:
```json
{
  "auth": {
    "type": "bearer",
    "value": "${API_TOKEN}"
  }
}
```

### 4. Configuration Validation
- Size limits enforced
- URL validation
- Parameter validation
- Unique tool names required

## 🛠️ Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Development mode with auto-reload
npm run dev

# Clean build artifacts
npm run clean
```

## 📚 Technology Stack

- **MCP SDK**: v1.23.0
- **HTTP Client**: undici v6.0.0
- **Validation**: Zod v3.23.8
- **Runtime**: Node.js with TypeScript

## 📄 License

MIT
