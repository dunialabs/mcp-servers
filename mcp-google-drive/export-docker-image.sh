#!/bin/bash
# Export Docker image for sharing with colleagues

set -e

IMAGE_NAME="peta/mcp-google-drive:latest"
OUTPUT_DIR="./docker-export"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ARCHIVE_NAME="mcp-google-drive_${TIMESTAMP}.tar.gz"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}=== Exporting Docker Image for Distribution ===${NC}"
echo ""

# Check if image exists
if ! docker images "$IMAGE_NAME" --format "{{.Repository}}" | grep -q "peta/mcp-google-drive"; then
    echo -e "${YELLOW}Error: Docker image not found: $IMAGE_NAME${NC}"
    echo ""
    echo "Please build the image first:"
    echo "  npm run build"
    echo "  docker build -t peta/mcp-google-drive:latest ."
    exit 1
fi

echo -e "${GREEN}✓ Found Docker image: $IMAGE_NAME${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"

# Export Docker image
echo -e "${BLUE}1. Exporting Docker image...${NC}"
docker save "$IMAGE_NAME" -o "$OUTPUT_DIR/mcp-google-drive.tar"
echo -e "${GREEN}✓ Exported to: $OUTPUT_DIR/mcp-google-drive.tar${NC}"
echo ""

# Compress the tar file
echo -e "${BLUE}2. Compressing image...${NC}"
gzip -f "$OUTPUT_DIR/mcp-google-drive.tar"
mv "$OUTPUT_DIR/mcp-google-drive.tar.gz" "$OUTPUT_DIR/$ARCHIVE_NAME"
echo -e "${GREEN}✓ Compressed to: $OUTPUT_DIR/$ARCHIVE_NAME${NC}"
echo ""

# Copy instructions
echo -e "${BLUE}3. Creating setup instructions...${NC}"
cat > "$OUTPUT_DIR/README.txt" << 'EOF'
====================================================================
  @peta/mcp-google-drive Docker Image - Setup Instructions
====================================================================

## What's included:
- mcp-google-drive_XXXXXXXX.tar.gz : Docker image archive

## Prerequisites:
- Docker Desktop installed (https://www.docker.com/products/docker-desktop)
- Google OAuth credentials (access_token and refresh_token)

## Quick Start:

### 1. Load Docker Image

# Decompress the archive
gunzip mcp-google-drive_*.tar.gz

# Load the image into Docker
docker load -i mcp-google-drive_*.tar

# Verify the image is loaded
docker images | grep mcp-google-drive

You should see:
  peta/mcp-google-drive   latest   ...   ...   ~230MB


### 2. Prepare Your Google OAuth Credentials

You need to get your Google OAuth access token with Drive API access.
Set it in an environment variable:

export accessToken='ya29.xxx...'


### 3. Test the MCP Server

# Send a test MCP initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | \
docker run -i --rm -e accessToken peta/mcp-google-drive:latest

Expected response should include:
  {"result":{"protocolVersion":"2024-11-05",...},"id":1}


### 4. Use with PETA Core

Add this configuration to your peta-core server settings:

{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e", "accessToken",
    "-e", "HTTP_PROXY",
    "-e", "HTTPS_PROXY",
    "peta/mcp-google-drive:latest"
  ],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}


### 5. Environment Variables

Required:
- accessToken : Google OAuth access token string (e.g., ya29.xxx...)

Optional:
- HTTP_PROXY : HTTP proxy URL (e.g., http://127.0.0.1:7897)
- HTTPS_PROXY : HTTPS proxy URL (e.g., http://127.0.0.1:7897)
- LOG_LEVEL : Logging level (DEBUG, INFO, WARN, ERROR, NONE)


## Features:

The MCP server provides 21 tools for Google Drive:
- File search and retrieval
- File/folder creation, update, deletion
- File tree navigation
- Trash management
- Batch operations
- Permission management
- File upload/export
- And more...


## Troubleshooting:

1. "accessToken environment variable not set"
   → Make sure to set accessToken before running:
     export accessToken='ya29.xxx...'

2. Container exits immediately
   → Use the -i flag to keep stdin open:
     docker run -i --rm -e accessToken peta/mcp-google-drive:latest

3. Network/proxy issues
   → Set HTTP_PROXY and HTTPS_PROXY environment variables:
     docker run -i --rm \
       -e accessToken \
       -e HTTP_PROXY='http://127.0.0.1:7897' \
       -e HTTPS_PROXY='http://127.0.0.1:7897' \
       peta/mcp-google-drive:latest


## Support:

For more information, contact the PETA team.

====================================================================
EOF

echo -e "${GREEN}✓ Created: $OUTPUT_DIR/README.txt${NC}"
echo ""

# Create version info
cat > "$OUTPUT_DIR/VERSION.txt" << EOF
Docker Image: peta/mcp-google-drive:latest
Package: @peta/mcp-google-drive
Version: $(node -p "require('./package.json').version")
Build Date: $(date)
Image ID: $(docker images peta/mcp-google-drive:latest --format "{{.ID}}")
Image Size: $(docker images peta/mcp-google-drive:latest --format "{{.Size}}")
EOF

echo -e "${GREEN}✓ Created: $OUTPUT_DIR/VERSION.txt${NC}"
echo ""

# Get file sizes
ARCHIVE_SIZE=$(ls -lh "$OUTPUT_DIR/$ARCHIVE_NAME" | awk '{print $5}')

echo -e "${GREEN}=== Export Complete! ===${NC}"
echo ""
echo "Package location: $OUTPUT_DIR/"
echo "Archive file: $ARCHIVE_NAME ($ARCHIVE_SIZE)"
echo ""
echo "Contents:"
echo "  - $ARCHIVE_NAME (Docker image)"
echo "  - README.txt (Setup instructions)"
echo "  - VERSION.txt (Version information)"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Share the entire $OUTPUT_DIR/ folder with your colleague"
echo "2. They should follow the instructions in README.txt"
echo ""
echo "Transfer methods:"
echo "  - Cloud storage (Google Drive, Dropbox, etc.)"
echo "  - Company file share"
echo "  - USB drive"
echo "  - Internal chat/email (if size permits)"
