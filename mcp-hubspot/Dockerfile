# ghcr.io/dunialabs/mcp-servers/hubspot - Docker image for STDIO mode
FROM node:20-alpine

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/hubspot"
LABEL org.opencontainers.image.description="HubSpot MCP Server for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers"
LABEL org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-hubspot"

RUN apk add --no-cache \
    ca-certificates \
    && rm -rf /var/cache/apk/*

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts && \
    npm cache clean --force

COPY dist ./dist

ENV NODE_ENV=production

USER node

ENTRYPOINT ["node", "dist/stdio.js"]
