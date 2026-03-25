#!/bin/bash
set -e

IMAGE_NAME="ghcr.io/dunialabs/mcp-servers/apps-test"
VERSION=$(node -p "require('./package.json').version")

if [ "$1" = "clean" ]; then
  echo "Cleaning buildx builder..."
  if docker buildx inspect multiplatform >/dev/null 2>&1; then
    docker buildx rm multiplatform
  fi
  exit 0
fi

if [ ! -d "dist" ]; then
  echo "Error: dist directory not found. Please run 'npm run build' first."
  exit 1
fi

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
else
  docker build \
    --tag ${IMAGE_NAME}:${VERSION} \
    --tag ${IMAGE_NAME}:latest \
    .
fi
