# Multi-stage Dockerfile for MySQL MCP Server

# ============================================
# Stage 1: Build
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci

COPY src ./src

RUN npm run build

# ============================================
# Stage 2: Production
# ============================================
FROM node:20-alpine

ARG VERSION=unknown

WORKDIR /app

RUN addgroup -g 1001 -S mcpuser && \
    adduser -S -u 1001 -G mcpuser mcpuser

COPY package*.json ./

RUN npm ci --omit=dev && \
    npm cache clean --force

COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh && \
    chown -R mcpuser:mcpuser /app

USER mcpuser

ENV NODE_ENV=production \
    LOG_LEVEL=INFO

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "process.exit(0)" || exit 1

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/mysql" \
      org.opencontainers.image.description="Production-ready MySQL MCP Server with database management tools" \
      org.opencontainers.image.vendor="PETA Team" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers" \
      org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-mysql"

CMD ["./docker-entrypoint.sh"]
