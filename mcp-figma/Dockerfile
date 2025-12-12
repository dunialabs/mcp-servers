# ghcr.io/dunialabs/mcp-servers/figma - Docker image for STDIO mode
FROM node:18-alpine

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/figma"
LABEL org.opencontainers.image.description="Figma MCP Server for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers/tree/main/mcp-figma"

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
# Environment variables to be passed:
#   - accessToken: Figma OAuth access token or Personal Access Token (required)
#   - HTTP_PROXY: Proxy URL (optional)
#   - HTTPS_PROXY: Proxy URL (optional)
ENTRYPOINT ["node", "dist/stdio.js"]
