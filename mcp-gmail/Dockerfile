# ghcr.io/dunialabs/mcp-servers/gmail - Docker image for STDIO mode
FROM node:20-alpine

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/gmail"
LABEL org.opencontainers.image.description="Gmail MCP Server for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers"
LABEL org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-gmail"

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

# Run as non-root user for better container security
USER node

# The container will run in STDIO mode
# STDIN/STDOUT will be used for MCP communication
# Environment variables can be passed when running the container
ENTRYPOINT ["node", "dist/stdio.js"]
