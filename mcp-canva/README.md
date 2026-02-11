# Canva MCP Server

A Model Context Protocol (MCP) server that integrates with Canva Connect API v1, enabling Claude to create and manage designs, assets, folders, exports, imports, brand templates, and more.

**Built with TypeScript + MCP SDK + Canva Connect API**

---

## ✨ Features

- 🎨 **Design Management**: Create, list, get, and export designs
- 📁 **Folder Organization**: Create, update, delete folders and manage contents
- 🖼️ **Asset Management**: Upload, update, delete, and retrieve assets
- 📤 **Export Operations**: Export designs in multiple formats (PDF, JPG, PNG, GIF, PPTX, MP4, SVG)
- 📥 **Import Operations**: Import designs from URLs
- 🎯 **Brand Templates**: List, get, and autofill brand templates
- 👤 **User Information**: Get user profile and capabilities
- 🔐 **OAuth Integration**: Seamless token management via Console platform
- 🐳 **Docker Support**: Multi-platform images (amd64/arm64)
- 📝 **Complete TypeScript**: Strict typing with Zod validation
- 🚀 **Production Ready**: Error handling, logging, timeout management

---

## 📋 Available Tools (30+)

### Design Tools
- `canvaCreateDesign` - Create a new design
- `canvaListDesigns` - List and search designs
- `canvaGetDesign` - Get design metadata
- `canvaGetDesignPages` - List pages in a design
- `canvaGetDesignExportFormats` - Get available export formats

### Asset Tools
- `canvaUploadAssetFromUrl` - Upload asset from URL
- `canvaGetAssetUploadStatus` - Check upload status
- `canvaGetUrlAssetUploadStatus` - Check URL upload status
- `canvaGetAsset` - Get asset details
- `canvaUpdateAsset` - Update asset metadata
- `canvaDeleteAsset` - Delete asset

### Folder Tools
- `canvaCreateFolder` - Create new folder
- `canvaGetFolder` - Get folder details
- `canvaUpdateFolder` - Update folder name
- `canvaDeleteFolder` - Delete folder
- `canvaListFolderItems` - List folder contents
- `canvaMoveFolderItem` - Move items between folders

### Export Tools
- `canvaCreateExport` - Create export job
- `canvaGetExportStatus` - Check export status

### Import Tools
- `canvaImportDesignFromUrl` - Import design from URL
- `canvaGetImportStatus` - Check import status
- `canvaGetUrlImportStatus` - Check URL import status

### Brand Template Tools
- `canvaListBrandTemplates` - List brand templates
- `canvaGetBrandTemplate` - Get template details
- `canvaGetBrandTemplateDataset` - Get template dataset
- `canvaCreateAutofill` - Create autofill job
- `canvaGetAutofillStatus` - Check autofill status

### User Tools
- `canvaGetUser` - Get current user info
- `canvaGetUserProfile` - Get user profile
- `canvaGetUserCapabilities` - Get user capabilities

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ or Docker
- Canva OAuth access token (see [Authentication](#-authentication))

### Installation

```bash
# Clone or navigate to the project
cd mcp-canva

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env and add your accessToken
```

### Running the Server

#### Option 1: Development Mode

```bash
npm run dev
```

#### Option 2: Production Build

```bash
npm run build
npm start
```

#### Option 3: Docker

```bash
# Build Docker image
docker build -t mcp-canva:latest .

# Run with Docker
docker run -i --rm \
  -e accessToken="your_token_here" \
  mcp-canva:latest
```

---

## 🔐 Authentication

This server uses OAuth 2.0 authentication with Canva Connect API.

### For Production (Console Platform)

The Console platform automatically manages OAuth tokens:

1. Configure your app in Console with Canva integration
2. Console handles OAuth flow and token refresh
3. Token is provided via `accessToken` environment variable
4. Server receives token updates via MCP notifications

### For Local Development

To get a test token for local development:

1. **Option 1**: Use Canva Connect API Starter Kit
2. **Option 2**: Create a custom OAuth flow
3. **Option 3**: Manual token acquisition via OAuth Playground

Detailed instructions: See [`local-docs/canva-oauth-integration.md`](../local-docs/canva-oauth-integration.md)

**Required OAuth Scopes**:
- `design:content:read`
- `design:content:write`
- `design:meta:read`
- `asset:read`
- `asset:write`
- `folder:read`
- `folder:write`
- `brandtemplate:content:read`
- `brandtemplate:meta:read`

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
# Required
accessToken=your_canva_oauth_token_here

# Optional
LOG_LEVEL=info                 # debug, info, warn, error
NODE_ENV=production            # development, production
CANVA_API_TIMEOUT=30000       # API timeout in milliseconds
```

### Claude Desktop Configuration

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS):

```json
{
  "mcpServers": {
    "canva": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-canva/dist/stdio.js"],
      "env": {
        "accessToken": "your_oauth_token_here"
      }
    }
  }
}
```

For development mode with hot reload:

```json
{
  "mcpServers": {
    "canva-dev": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/mcp-canva/src/stdio.ts"],
      "env": {
        "accessToken": "your_oauth_token_here",
        "LOG_LEVEL": "debug"
      }
    }
  }
}
```

**Using Docker** (recommended for production):

```json
{
  "mcpServers": {
    "canva": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "accessToken=your_oauth_token_here",
        "ghcr.io/dunialabs/mcp-servers/canva:latest"
      ]
    }
  }
}
```

Or use local Docker image:

```json
{
  "mcpServers": {
    "canva": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "-e", "accessToken=your_oauth_token_here",
        "-e", "LOG_LEVEL=info",
        "canva:local"
      ]
    }
  }
}
```

**Notes**:
- Replace `your_oauth_token_here` with your actual Canva OAuth token
- For Node.js mode, use absolute paths (not `~` or relative paths)
- Docker mode provides better isolation and easier deployment
- Local Docker image can be built with `./build-docker.sh`

Restart Claude Desktop after configuration.

---

## 📖 Usage Examples

### Create a Design

Canva supports two types of design creation:

**1. Preset Design Types** (doc, whiteboard, presentation):
```typescript
// Ask Claude:
"Create a new Canva presentation"

// Claude will call:
{
  "name": "canvaCreateDesign",
  "arguments": {
    "design_type": {
      "type": "preset",
      "name": "presentation"  // Options: "doc", "whiteboard", "presentation"
    },
    "title": "My Presentation"
  }
}
```

**2. Custom Dimensions** (width and height in pixels):
```typescript
// Ask Claude:
"Create a Canva design with custom size 1920x1080"

// Claude will call:
{
  "name": "canvaCreateDesign",
  "arguments": {
    "design_type": {
      "type": "custom",
      "width": 1920,   // 40-8000 pixels
      "height": 1080   // 40-8000 pixels
    },
    "title": "Custom Design"
  }
}
```

### Upload an Asset

```typescript
// Ask Claude:
"Upload an image from https://example.com/image.jpg to Canva"

// Claude will call:
{
  "name": "canvaUploadAssetFromUrl",
  "arguments": {
    "name": "My Image",
    "url": "https://example.com/image.jpg"
  }
}
```

### List Designs

```typescript
// Ask Claude:
"Show me my recent Canva designs"

// Claude will call:
{
  "name": "canvaListDesigns",
  "arguments": {
    "ownership": "owned",
    "sort_by": "modified_descending",
    "limit": 10
  }
}
```

### Export a Design

Canva supports multiple export formats with format-specific options:

**PDF Export** (with page size):
```typescript
{
  "name": "canvaCreateExport",
  "arguments": {
    "design_id": "DAF1234...",
    "format": {
      "type": "pdf",
      "size": "a4",  // Options: "a4", "a3", "letter", "legal"
      "export_quality": "pro",  // Options: "regular", "pro"
      "pages": [1, 2, 3]  // Optional: specific pages
    }
  }
}
```

**PNG Export** (with transparency):
```typescript
{
  "name": "canvaCreateExport",
  "arguments": {
    "design_id": "DAF1234...",
    "format": {
      "type": "png",
      "transparent_background": true,
      "lossless": true,
      "width": 1920,  // Optional: 40-25000 pixels
      "height": 1080
    }
  }
}
```

**MP4 Export** (video):
```typescript
{
  "name": "canvaCreateExport",
  "arguments": {
    "design_id": "DAF1234...",
    "format": {
      "type": "mp4",
      "quality": "horizontal_1080p"  // Options: horizontal_480p/720p/1080p/4k, vertical_480p/720p/1080p/4k
    }
  }
}
```

Supported formats: **PDF, JPG, PNG, PPTX, GIF, MP4, SVG**

### Brand Template Autofill

Create designs from brand templates by filling data fields:

**Text and Image Fields**:
```typescript
{
  "name": "canvaCreateAutofill",
  "arguments": {
    "brand_template_id": "DAB1234...",
    "title": "My Generated Design",
    "data": {
      "headline": {
        "type": "text",
        "text": "Welcome to Our Product"
      },
      "productImage": {
        "type": "image",
        "asset_id": "MAE5678..."
      }
    }
  }
}
```

**Chart Data Fields** (preview feature):
```typescript
{
  "name": "canvaCreateAutofill",
  "arguments": {
    "brand_template_id": "DAB1234...",
    "data": {
      "salesChart": {
        "type": "chart",
        "chart_data": {
          "rows": [
            {
              "cells": [
                { "type": "string", "value": "Q1" },
                { "type": "number", "value": 1000 }
              ]
            },
            {
              "cells": [
                { "type": "string", "value": "Q2" },
                { "type": "number", "value": 1500 }
              ]
            }
          ]
        }
      }
    }
  }
}
```

---

## 🛠️ Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development mode (hot reload) |
| `npm run build` | Build TypeScript |
| `npm start` | Run built code |
| `npm run clean` | Clean build directory |
| `npm test` | Run tests |
| `npm run lint` | Check code standards |
| `npm run lint:fix` | Auto-fix code standards |
| `npm run format` | Format code with Prettier |
| `npm run type-check` | TypeScript type checking |

### Project Structure

```
mcp-canva/
├── src/
│   ├── stdio.ts              # STDIO entry point
│   ├── server.ts             # MCP server + tool registration
│   ├── index.ts              # Module exports
│   ├── auth/
│   │   └── token.ts          # OAuth token management
│   ├── tools/
│   │   ├── designs.ts        # Design management tools
│   │   ├── assets.ts         # Asset management tools
│   │   ├── folders.ts        # Folder management tools
│   │   ├── exports.ts        # Export tools
│   │   ├── imports.ts        # Import tools
│   │   ├── brand-templates.ts # Brand template tools
│   │   └── user.ts           # User information tools
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   └── utils/
│       ├── canva-api.ts      # HTTP client for Canva API
│       ├── errors.ts         # Error handling utilities
│       └── logger.ts         # Logging system
├── tests/                     # Test files
├── dist/                      # Build output
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

### Architecture

- **McpServer API**: High-level API for tool registration
- **Zod Validation**: Runtime type checking and schema validation
- **Error Handling**: MCP standard error codes with proper mapping
- **Logging**: stderr-based logging for STDIO compatibility
- **Token Management**: Automatic token updates via notifications

---

## 🔒 Security Considerations

- ✅ **Input Validation**: All inputs validated with Zod schemas
- ✅ **Environment Variables**: Tokens stored securely in environment
- ✅ **Error Handling**: No sensitive data exposed in error messages
- ✅ **Token Refresh**: Automatic token updates from Console platform
- ✅ **API Rate Limits**: Respects Canva API rate limits
- ⚠️ **OAuth Scopes**: Only request necessary permissions

---

## 📚 API Documentation

- [Canva Connect API Documentation](https://www.canva.dev/docs/connect/)
- [Canva Connect API Reference](https://www.canva.dev/docs/connect/api-reference/)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)

---

## 🐛 Troubleshooting

### Token Issues

```
Error: Missing Canva credentials
```

**Solution**: Ensure `accessToken` environment variable is set correctly.

### API Rate Limits

Canva API has rate limits per endpoint:
- Design endpoints: 20-100 requests/minute
- Asset uploads: 30 requests/minute
- Export/Import: 20 requests/minute

**Solution**: Implement retry logic with exponential backoff if needed.

### Connection Issues

```
Error: Request timeout after 30000ms
```

**Solution**:
1. Check network connectivity
2. Increase timeout: `CANVA_API_TIMEOUT=60000`
3. Verify Canva API status

---

## 📄 License

MIT License - Free to use and modify

---

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript compiles without errors
- All tests pass
- Code follows ESLint/Prettier standards
- New tools include proper documentation

---

## 🙏 Acknowledgments

- Built with [Model Context Protocol](https://modelcontextprotocol.io)
- Powered by [Canva Connect API](https://www.canva.dev/docs/connect/)
- Based on [mcp-server-template](https://github.com/dunialabs/mcp-servers/tree/main/mcp-server-template)

---

**Happy designing with Canva and Claude!** 🎨✨
