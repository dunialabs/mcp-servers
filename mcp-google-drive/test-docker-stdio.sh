#!/bin/bash
# Test Docker STDIO communication

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}Testing Docker STDIO communication...${NC}"
echo ""

# Check if accessToken is set
if [ -z "$accessToken" ]; then
    echo -e "${RED}Error: accessToken environment variable is not set${NC}"
    echo ""
    echo "Please set accessToken first:"
    echo "  export accessToken='ya29.xxx...'"
    exit 1
fi

echo -e "${GREEN}✓ accessToken is set${NC}"
echo ""

# Test 1: Check if Docker image exists
echo -e "${BLUE}Test 1: Checking Docker image...${NC}"
if docker images peta/mcp-google-drive:latest --format "{{.Repository}}" | grep -q "peta/mcp-google-drive"; then
    echo -e "${GREEN}✓ Docker image exists${NC}"
else
    echo -e "${RED}✗ Docker image not found. Please run: npm run docker:build${NC}"
    exit 1
fi
echo ""

# Test 2: Send MCP initialize request
echo -e "${BLUE}Test 2: Sending MCP initialize request...${NC}"
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | \
docker run -i --rm -e accessToken -e HTTP_PROXY -e HTTPS_PROXY peta/mcp-google-drive:latest | head -1

echo ""
echo -e "${GREEN}✓ Docker STDIO communication works!${NC}"
echo ""
echo "To use in peta-core, configure:"
echo '{
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
    "accessToken": "YOUR_ACCESS_TOKEN_HERE"
  }
}'
