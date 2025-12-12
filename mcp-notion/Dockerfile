# ghcr.io/dunialabs/mcp-servers/notion - Docker image for STDIO mode
FROM node:18-alpine

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/notion"
LABEL org.opencontainers.image.description="Notion MCP Server for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers"
LABEL org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-notion"

# Install necessary system dependencies
RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (production only, skip scripts)
RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

# Copy pre-built files (must build before docker build)
COPY dist ./dist

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production

# Add health check (optional, for future use)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
#   CMD node -e "console.log('healthy')" || exit 1

# The container will run in STDIO mode
# STDIN/STDOUT will be used for MCP communication
# Environment variables to be passed:
#   - notionToken: Notion Integration or OAuth token (required)
#   - HTTP_PROXY: Proxy URL (optional)
#   - HTTPS_PROXY: Proxy URL (optional)
ENTRYPOINT ["node", "dist/stdio.js"]
