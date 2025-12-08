# Docker Deployment Guide

**@petaio/mcp-google-drive** - Docker deployment for STDIO mode

## Quick Start

### 1. Pull the Docker Image (Recommended)

```bash
# Pull from Docker Hub (supports amd64 and arm64)
docker pull petaio/mcp-google-drive:latest
```

**Or build locally for single architecture:**

```bash
# Build TypeScript code first
npm run build

# Build for your current architecture only
docker build -t petaio/mcp-google-drive:latest .
```

**For multi-architecture build (maintainers only):**

```bash
npm run build
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t petaio/mcp-google-drive:latest \
  --push \
  .
```

### 2. Test Docker STDIO Communication

```bash
# Set your Google OAuth credentials
export accessToken='ya29.xxx...'

# Run test
./test-docker-stdio.sh
```

### 3. Use in PETA Core

**launchConfig for peta-core:**

```json
{
  "command": "docker",
  "args": [
    "run",
    "--pull=always",
    "-i",
    "--rm",
    "-e", "accessToken",
    "-e", "HTTP_PROXY",
    "-e", "HTTPS_PROXY",
    "petaio/mcp-google-drive:latest"
  ],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

**Docker Arguments Explained:**

- **`--pull=always`**: Automatically checks for and pulls the latest image version on each startup
  - Ensures you're always using the latest features and security updates
  - Small network overhead (~1-2 seconds) to check for updates
  - Alternative: `--pull=missing` (only pull if image doesn't exist locally)

- **`-i`**: Interactive mode, keeps stdin open for STDIO communication

- **`--rm`**: Automatically removes the container when it exits, saves disk space

- **`-e accessToken`**: Passes the OAuth access token from parent process to container

- **`-e HTTP_PROXY`** / **`-e HTTPS_PROXY`**: (Optional) Passes proxy settings if needed

## Environment Variables

The Docker container accepts these environment variables:

- **`accessToken`** (Required): Google OAuth access token string
  - Example: `ya29.xxx...`
  - The server will automatically refresh the token when needed

- **`HTTP_PROXY`** (Optional): HTTP proxy URL
  - ⚠️ **Important**: Use `host.docker.internal` instead of `127.0.0.1` for Docker
  - Example: `http://host.docker.internal:7897`
- **`HTTPS_PROXY`** (Optional): HTTPS proxy URL
  - Example: `http://host.docker.internal:7897`
  - See [PROXY.md](./PROXY.md) for details
- **`LOG_LEVEL`** (Optional): Logging level (`DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`)

## Docker Commands

### Pull from Docker Hub (Recommended)

```bash
# Pull the latest version (supports both amd64 and arm64)
docker pull petaio/mcp-google-drive:latest

# Or pull a specific version
docker pull petaio/mcp-google-drive:1.0.0
```

The image automatically supports multiple architectures:
- `linux/amd64` - Intel Mac, Windows, Linux x86_64
- `linux/arm64` - M1/M2/M3 Mac, ARM servers

Docker will automatically select the correct architecture for your system.

### Build Multi-Architecture Image (For Maintainers)

```bash
# Build TypeScript code first
npm run build

# Build and push multi-architecture image
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t petaio/mcp-google-drive:latest \
  -t petaio/mcp-google-drive:1.0.0 \
  --push \
  .
```

**Note**: Multi-architecture builds require `--push` flag. You cannot use `--load` for multi-arch images.

### Run Interactively

```bash
# Interactive mode with STDIO
docker run -i --rm \
  -e accessToken='ya29.xxx...' \
  peta/mcp-google-drive:latest
```

### Run with Proxy

```bash
# With proxy configuration (use host.docker.internal for Docker)
docker run -i --rm \
  -e accessToken='ya29.xxx...' \
  -e HTTP_PROXY='http://host.docker.internal:7897' \
  -e HTTPS_PROXY='http://host.docker.internal:7897' \
  peta/mcp-google-drive:latest
```

**Note**: See [PROXY.md](./PROXY.md) for proxy configuration details.

### View Container Logs

```bash
# View logs from stderr (container must keep stdin open)
docker run -i \
  -e accessToken='ya29.xxx...' \
  peta/mcp-google-drive:latest 2>&1 | grep '\[.*\]'
```

### Test MCP Initialize

```bash
# Send MCP initialize request
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}' | \
docker run -i --rm \
  -e accessToken='ya29.xxx...' \
  peta/mcp-google-drive:latest
```

Expected response:
```json
{
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": { "listChanged": true },
      "resources": { "listChanged": true },
      "completions": {}
    },
    "serverInfo": {
      "name": "google-drive",
      "version": "1.0.0"
    }
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## Image Management

### List Images

```bash
# List all petaio/mcp-google-drive images
docker images petaio/mcp-google-drive
```

### Remove Image

```bash
# Remove specific version
docker rmi petaio/mcp-google-drive:1.0.0

# Remove all versions
docker rmi $(docker images petaio/mcp-google-drive -q)
```

### Inspect Multi-Architecture Manifest

```bash
# View supported architectures
docker manifest inspect petaio/mcp-google-drive:latest
```

## Publishing to Docker Hub (For Maintainers)

### 1. Login to Docker Hub

```bash
docker login
```

### 2. Build and Push Multi-Architecture Image

```bash
# Build TypeScript first
npm run build

# Build and push for multiple architectures
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t petaio/mcp-google-drive:latest \
  -t petaio/mcp-google-drive:1.0.0 \
  --push \
  .
```

**Important Notes:**
- Multi-architecture builds require `--push` flag (cannot use `--load`)
- Both `linux/amd64` and `linux/arm64` will be built and pushed
- Users will automatically get the correct architecture when pulling

### 3. Verify the Push

```bash
# Check that both architectures are available
docker manifest inspect petaio/mcp-google-drive:latest
```

## Troubleshooting

### Container Exits Immediately

**Problem**: Container exits right after starting

**Solution**: Make sure to use `-i` flag to keep stdin open:
```bash
docker run -i --rm -e accessToken peta/mcp-google-drive:latest
```

### accessToken Not Found

**Problem**: Container logs show "accessToken environment variable not set"

**Solution**: Ensure accessToken is passed correctly:
```bash
# Check environment variable is set
echo $accessToken

# Pass to Docker with -e flag
docker run -i --rm -e accessToken peta/mcp-google-drive:latest
```

### Network Issues / Proxy Required

**Problem**: Cannot connect to Google Drive API, or see error like:
```
connect ECONNREFUSED 127.0.0.1:7897
```

**Solution**: Use correct proxy address for Docker:
```bash
# Use host.docker.internal instead of 127.0.0.1
docker run -i --rm \
  -e accessToken \
  -e HTTP_PROXY='http://host.docker.internal:7897' \
  -e HTTPS_PROXY='http://host.docker.internal:7897' \
  peta/mcp-google-drive:latest
```

See [PROXY.md](./PROXY.md) for detailed proxy configuration.

### Image Build Fails

**Problem**: `npm ci` fails during build

**Solution**: Build TypeScript first:
```bash
# Build dist/ directory first
npm run build

# Then build Docker image
docker build -t peta/mcp-google-drive:latest .
```

## Advanced Usage

### Multi-stage Build (Smaller Image)

If you want a smaller image, you can use multi-stage build:

```dockerfile
# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build

# Production stage
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production --ignore-scripts
COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
ENTRYPOINT ["node", "dist/stdio.js"]
```

### Custom Entrypoint

```bash
# Override entrypoint for debugging
docker run -i --rm \
  --entrypoint /bin/sh \
  peta/mcp-google-drive:latest
```

## Image Size

The current image size:
- **Base image**: ~170 MB (node:18-alpine)
- **Dependencies**: ~60 MB
- **Application code**: ~1 MB
- **Total**: ~230 MB

## Security Considerations

1. **Never commit accessToken to version control**
2. **Use environment variables to pass credentials**
3. **Remove containers after use with `--rm` flag**
4. **Keep the Docker image updated with security patches**
5. **Use specific version tags in production, not `latest`**

## Performance

- **Cold start**: ~1-2 seconds (container initialization)
- **Warm start**: ~100ms (if image is cached)
- **Memory usage**: ~50-100 MB (depends on usage)
- **CPU usage**: Minimal when idle

## Comparison with Other Deployment Methods

| Method | Startup Time | Resource Usage | Isolation | Portability |
|--------|--------------|----------------|-----------|-------------|
| **Docker** | 1-2s | Medium | ✅ Excellent | ✅ Excellent |
| **NPX** | 500ms | Low | ❌ None | ✅ Good |
| **Node Direct** | <100ms | Low | ❌ None | ⚠️ Fair |

Choose Docker when:
- ✅ You need environment isolation
- ✅ You want consistent behavior across different systems
- ✅ You need easy distribution and deployment
- ✅ You have Docker infrastructure in place
