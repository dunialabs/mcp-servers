FROM node:20-alpine

LABEL org.opencontainers.image.title="ghcr.io/dunialabs/mcp-servers/apps-test"
LABEL org.opencontainers.image.description="MCP Apps test server for PETA ecosystem"
LABEL org.opencontainers.image.vendor="PETA Team"
LABEL org.opencontainers.image.source="https://github.com/dunialabs/mcp-servers"
LABEL org.opencontainers.image.documentation="https://github.com/dunialabs/mcp-servers/tree/main/mcp-apps-test"

RUN apk add --no-cache ca-certificates && rm -rf /var/cache/apk/*

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY dist ./dist

ENV NODE_ENV=production
ENV HTTP_PROXY="" \
    HTTPS_PROXY="" \
    http_proxy="" \
    https_proxy="" \
    NO_PROXY="*" \
    no_proxy="*"

ENTRYPOINT ["node", "dist/stdio.js"]
