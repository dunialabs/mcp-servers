# @petaio/mcp-server-template - Docker image for STDIO mode
FROM node:20-alpine

LABEL org.opencontainers.image.title="@petaio/mcp-server-template"
LABEL org.opencontainers.image.description="MCP Server Template for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers/tree/main/mcp-server-template"

# Install necessary system dependencies
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only, skip scripts)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy pre-built files (must build before docker build)
COPY dist ./dist

# Set environment
ENV NODE_ENV=production

# Unset proxy environment variables by default
# This prevents inheriting proxy settings from the host
# If proxy is needed, it can be explicitly set when running the container
ENV HTTP_PROXY="" \
    HTTPS_PROXY="" \
    http_proxy="" \
    https_proxy="" \
    NO_PROXY="*" \
    no_proxy="*"

# The container will run in STDIO mode
# STDIN/STDOUT will be used for MCP communication
# Environment variables can be passed when running the container
ENTRYPOINT ["node", "dist/stdio.js"]
