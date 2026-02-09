# MCP Google Docs

Google Docs MCP Server - Read, write, and edit Google Documents via Model Context Protocol.

## Features

- **13 tools** for complete Google Docs operations
- Markdown support for reading and writing
  - Headings (`# H1` through `###### H6`)
  - **Bold** (`**text**`) - inline
  - *Italic* (`*text*`) - inline
  - ***Bold+Italic*** (`***text***`)
  - ~~Strikethrough~~ (`~~text~~`) - inline
  - Bullet lists (`- item`)
  - Links (`[text](url)`) - read-only, use `gdocsFormatText` to add links
- Text and paragraph formatting
- Table and image insertion
- OAuth 2.0 authentication via PETA Core

## Tools

### Document Discovery
| Tool | Description |
|------|-------------|
| `gdocsListDocuments` | List user's Google Docs documents |
| `gdocsSearchDocuments` | Search documents by content or title |

### Document Operations
| Tool | Description |
|------|-------------|
| `gdocsCreateDocument` | Create a new document with optional Markdown content |
| `gdocsReadDocument` | Read document content (Markdown/text/JSON format) |

### Content Editing
| Tool | Description |
|------|-------------|
| `gdocsInsertText` | Insert text at a specific position |
| `gdocsReplaceText` | Find and replace text throughout the document |
| `gdocsDeleteRange` | Delete content in a specific range |

### Markdown Support
| Tool | Description |
|------|-------------|
| `gdocsWriteMarkdown` | Replace entire document content with Markdown |
| `gdocsAppendMarkdown` | Append Markdown content to the end |

### Formatting
| Tool | Description |
|------|-------------|
| `gdocsFormatText` | Apply text formatting (bold, italic, font, color, etc.) |
| `gdocsFormatParagraph` | Apply paragraph formatting (alignment, heading, spacing) |

### Structural Elements
| Tool | Description |
|------|-------------|
| `gdocsInsertTable` | Insert a table at a specific position |
| `gdocsInsertImage` | Insert an image from URL |

## OAuth Scopes Required

| Scope | Purpose |
|-------|---------|
| `https://www.googleapis.com/auth/documents` | Read and write document content |
| `https://www.googleapis.com/auth/drive.readonly` | List and search documents |

## Installation

```bash
npm install
npm run build
```

## Usage

### With PETA Core (Node.js)

The server is designed to work with PETA Core, which handles OAuth authentication and token refresh.

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "node",
      "args": ["/path/to/mcp-google-docs/dist/stdio.js"],
      "env": {
        "accessToken": "${GOOGLE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### With PETA Core (Docker)

```json
{
  "mcpServers": {
    "google-docs": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm", "--pull=always",
        "-e", "accessToken",
        "ghcr.io/dunialabs/mcp-servers/google-docs:latest"
      ],
      "env": {
        "accessToken": "${GOOGLE_ACCESS_TOKEN}"
      }
    }
  }
}
```

### Docker Manual Testing

```bash
# Build locally
npm run build
./build-docker.sh

# Run
docker run -i --rm \
  -e accessToken="ya29.xxx" \
  ghcr.io/dunialabs/mcp-servers/google-docs:latest
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Type check
npm run type-check

# Lint
npm run lint

# Format
npm run format
```

## License

MIT
