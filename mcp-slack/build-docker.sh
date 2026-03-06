#!/bin/bash

set -e

IMAGE_NAME="ghcr.io/dunialabs/mcp-servers/slack"
VERSION=$(node -p "require('./package.json').version")

if [ "$1" = "clean" ]; then
    echo "Cleaning up buildx builder and containers..."

    if docker buildx inspect multiplatform >/dev/null 2>&1; then
        docker buildx rm multiplatform
        echo "Removed buildx builder: multiplatform"
    else
        echo "No multiplatform builder found"
    fi

    echo "Cleanup complete"
    exit 0
fi

if [ ! -d "dist" ]; then
    echo "Error: dist directory not found. Please run 'npm run build' first."
    exit 1
fi

echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"

if [ "$1" = "multi" ]; then
    if ! docker buildx inspect multiplatform >/dev/null 2>&1; then
        docker buildx create --name multiplatform --use
    else
        docker buildx use multiplatform
    fi

    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        --tag ${IMAGE_NAME}:${VERSION} \
        --tag ${IMAGE_NAME}:latest \
        .
elif [ "$1" = "push" ]; then
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

    echo "Pushed to GHCR: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
else
    docker build \
        --tag ${IMAGE_NAME}:${VERSION} \
        --tag ${IMAGE_NAME}:latest \
        .

    echo "Local build complete: ${IMAGE_NAME}:${VERSION}, ${IMAGE_NAME}:latest"
fi
