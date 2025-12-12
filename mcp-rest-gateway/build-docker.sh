#!/bin/bash

# Multi-platform Docker build script for mcp-rest-gateway
# Builds for linux/amd64 and linux/arm64

set -e

IMAGE_NAME="ghcr.io/dunialabs/mcp-servers/rest-gateway"

# Read version from package.json (single source of truth)
VERSION=$(node -p "require('./package.json').version")

# Select build mode
if [ "$1" = "clean" ]; then
    echo "🧹 Cleaning up buildx builder and containers..."
    echo ""

    if docker buildx inspect multiplatform >/dev/null 2>&1; then
        docker buildx rm multiplatform
        echo "✅ Removed buildx builder: multiplatform"
    else
        echo "ℹ️  No multiplatform builder found"
    fi

    echo ""
    echo "✅ Cleanup complete!"
    echo ""
    echo "Note: Build cache has been preserved. To clear cache, run:"
    echo "  docker buildx prune"

    exit 0
fi

# Check if dist directory exists (only for build operations)
if [ ! -d "dist" ]; then
    echo "❌ Error: dist directory not found. Please run 'npm run build' first."
    exit 1
fi

echo "🚀 Building Docker image: ${IMAGE_NAME}:${VERSION}"
echo ""

# Select build mode
if [ "$1" = "multi" ]; then
    echo "📦 Multi-platform mode (linux/amd64, linux/arm64)"
    echo "⚠️  Note: Multi-platform images will be built but not loaded to local Docker"
    echo "   Use 'docker pull ${IMAGE_NAME}:${VERSION}' after pushing to registry"
    echo ""

    # Create buildx builder
    if ! docker buildx inspect multiplatform >/dev/null 2>&1; then
        docker buildx create --name multiplatform --use
        echo "✅ Created buildx builder: multiplatform"
    else
        docker buildx use multiplatform
        echo "✅ Using existing buildx builder: multiplatform"
    fi

    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag ${IMAGE_NAME}:${VERSION} \
        --tag ${IMAGE_NAME}:latest \
        .

    echo ""
    echo "✅ Multi-platform build complete (not loaded locally)"
    echo ""
    echo "📤 To push to GitHub Container Registry:"
    echo "  docker buildx build --platform linux/amd64,linux/arm64 \\"
    echo "    --tag ${IMAGE_NAME}:${VERSION} --tag ${IMAGE_NAME}:latest --push ."

elif [ "$1" = "push" ]; then
    echo "📤 Building and pushing multi-platform image..."
    echo ""

    # Create buildx builder
    if ! docker buildx inspect multiplatform >/dev/null 2>&1; then
        docker buildx create --name multiplatform --use
    else
        docker buildx use multiplatform
    fi

    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag ${IMAGE_NAME}:${VERSION} \
        --tag ${IMAGE_NAME}:latest \
        --push \
        .

    echo ""
    echo "✅ Pushed to GitHub Container Registry!"
    echo "  - ${IMAGE_NAME}:${VERSION}"
    echo "  - ${IMAGE_NAME}:latest"

else
    echo "📦 Local build mode (current platform only)"
    echo ""

    docker build \
        --tag ${IMAGE_NAME}:${VERSION} \
        --tag ${IMAGE_NAME}:latest \
        .

    echo ""
    echo "✅ Local build complete!"
    echo ""
    echo "📦 Built images:"
    echo "  - ${IMAGE_NAME}:${VERSION}"
    echo "  - ${IMAGE_NAME}:latest"
fi

echo ""
echo "🧪 Test locally:"
echo "  docker run -i --rm -e GATEWAY_CONFIG='{\"apis\":[...]}' ${IMAGE_NAME}:latest"
echo ""
echo "Usage:"
echo "  ./build-docker.sh          # Build for current platform only (fast)"
echo "  ./build-docker.sh multi    # Build for multiple platforms (amd64, arm64)"
echo "  ./build-docker.sh push     # Build multi-platform and push to GHCR"
echo "  ./build-docker.sh clean    # Clean up buildx builder and containers"
