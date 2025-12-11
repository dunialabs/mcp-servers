# @petaio/mcp-rest-gateway - Docker image for STDIO mode
FROM node:20-alpine

LABEL org.opencontainers.image.title="@petaio/mcp-rest-gateway"
LABEL org.opencontainers.image.description="REST API to MCP Server Gateway for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers/tree/main/mcp-rest-gateway"

# Create app directory
# Note: ca-certificates removed due to ARM64 build compatibility issues
# node:20-alpine base image already includes sufficient certificates
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
#   - GATEWAY_CONFIG: REST API configuration JSON (required)
#   - LOG_LEVEL: Logging level (optional, default: INFO)
#   - HTTP_PROXY: Proxy URL (optional)
#   - HTTPS_PROXY: Proxy URL (optional)
ENTRYPOINT ["node", "dist/stdio.js"]
