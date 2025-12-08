#!/bin/bash
# Build Docker image for @petaio/mcp-google-drive

set -e

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")

echo "🔨 Building TypeScript..."
npm run build

echo "🐳 Building Docker image..."
docker build \
  -t petaio/mcp-google-drive:latest \
  -t petaio/mcp-google-drive:${VERSION} \
  .

echo "✅ Build complete!"
echo ""
echo "Images created:"
echo "  - petaio/mcp-google-drive:latest"
echo "  - petaio/mcp-google-drive:${VERSION}"
echo ""
echo "To test the image:"
echo "  export AUTH_DATA='{\"access_token\":\"ya29.xxx...\"}'"
echo "  docker run -i --rm -e AUTH_DATA petaio/mcp-google-drive:latest"
echo ""
echo "To push to Docker Hub:"
echo "  docker push petaio/mcp-google-drive:latest"
echo "  docker push petaio/mcp-google-drive:${VERSION}"
