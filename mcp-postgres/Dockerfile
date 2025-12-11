# Multi-stage Dockerfile for PostgreSQL MCP Server
#
# This Dockerfile creates a production-ready container with:
# - Multi-stage build for smaller image size
# - Proper signal handling (SIGTERM/SIGINT forwarding)
# - Non-root user for security
# - Stdin monitoring for Docker --rm lifecycle

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

# Build argument for version (read from package.json during build)
ARG VERSION=unknown

WORKDIR /app

# Copy package files and TypeScript configuration
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine

# Build argument for version (passed from build-docker.sh)
ARG VERSION=unknown

# Note: Removed dumb-init due to ARM64 build compatibility issues
# Node.js handles signals properly in Docker when using exec form of CMD

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S mcpuser && \
    adduser -S -u 1001 -G mcpuser mcpuser

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy docker-entrypoint.sh
COPY docker-entrypoint.sh ./

# Set execute permission and change ownership to non-root user
RUN chmod +x docker-entrypoint.sh && \
    chown -R mcpuser:mcpuser /app

# Switch to non-root user
USER mcpuser

# Environment variables (defaults)
ENV NODE_ENV=production \
    LOG_LEVEL=INFO \
    ACCESS_MODE=readonly

# Health check (for debugging, not used by MCP)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

# Labels for metadata (version automatically read from package.json)
LABEL org.opencontainers.image.title="PostgreSQL MCP Server" \
      org.opencontainers.image.description="Production-ready PostgreSQL MCP Server with proper Docker lifecycle management" \
      org.opencontainers.image.vendor="PETA Team" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="MIT"

# Run the application via docker-entrypoint.sh
# The entrypoint script handles localhost remapping and then execs node
# Use exec form to ensure proper signal forwarding
# Node.js in exec form handles SIGTERM/SIGINT properly without dumb-init
CMD ["./docker-entrypoint.sh"]
