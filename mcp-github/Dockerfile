# GitHub MCP Server - Multi-stage Docker Build
# Production-ready container for GitHub integration

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files and source code
COPY package*.json ./
COPY tsconfig.json ./
COPY src/ ./src/

# Install dependencies (including dev dependencies for build)
# The prepare script will automatically run npm run build
RUN npm ci

# Remove dev dependencies
RUN npm prune --production

# Production stage
FROM node:20-alpine AS runtime

# Set working directory
WORKDIR /app

# Copy only production dependencies and built code
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Add metadata labels for GitHub Container Registry
ARG VERSION=latest
LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/github" \
      org.opencontainers.image.description="Production-ready GitHub MCP Server for repository, issue, and PR management" \
      org.opencontextprotocol.image.vendor="PETA Team" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers" \
      org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-github"

# Set NODE_ENV to production
ENV NODE_ENV=production

# Run as non-root user for security
USER node

# Entry point
ENTRYPOINT ["node", "dist/stdio.js"]
