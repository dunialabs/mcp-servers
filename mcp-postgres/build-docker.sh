#!/bin/bash

# Multi-platform Docker image build script

set -e

IMAGE_NAME="ghcr.io/dunialabs/mcp-servers/postgres"

# Read version from package.json (single source of truth)
VERSION=$(node -p "require('./package.json').version")

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
        --build-arg VERSION=${VERSION} \
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
        --build-arg VERSION=${VERSION} \
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
        --build-arg VERSION=${VERSION} \
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
echo "  docker run -i --rm \\"
echo "    -e POSTGRES_URL=\"postgresql://user:password@localhost:5432/database\" \\"
echo "    -e ACCESS_MODE=\"readwrite\" \\"
echo "    ${IMAGE_NAME}:latest"
echo ""
echo "Note: localhost is automatically remapped to work in Docker:"
echo "  - MacOS/Windows: localhost → host.docker.internal"
echo "  - Linux: localhost → 172.17.0.1 (or gateway IP)"
echo ""
echo "Usage:"
echo "  ./build-docker.sh          # Build for current platform only (fast)"
echo "  ./build-docker.sh multi    # Build for multiple platforms (amd64, arm64)"
echo "  ./build-docker.sh push     # Build multi-platform and push to GHCR"
