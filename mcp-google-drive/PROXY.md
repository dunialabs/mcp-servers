# Proxy Configuration for Docker

## Problem

When running the MCP server in Docker with proxy settings, you may encounter this error:

```
MCP error -32603: Failed to ... connect ECONNREFUSED 127.0.0.1:7897
```

This happens because `127.0.0.1` inside a Docker container refers to the **container itself**, not your host machine.

## Solution

### Option 1: No Proxy (Recommended if not needed)

If you don't need a proxy to access Google APIs, simply don't set the proxy environment variables:

```bash
# Don't set HTTP_PROXY and HTTPS_PROXY
export accessToken='ya29.xxx...'
docker run -i --rm -e accessToken peta/mcp-google-drive:latest
```

### Option 2: Use Correct Proxy Address

If you need to use a proxy, replace `127.0.0.1` with the special Docker hostname:

**For macOS and Windows (Docker Desktop):**

```bash
export accessToken='ya29.xxx...'
export HTTP_PROXY='http://host.docker.internal:7897'
export HTTPS_PROXY='http://host.docker.internal:7897'

docker run -i --rm \
  -e accessToken \
  -e HTTP_PROXY \
  -e HTTPS_PROXY \
  peta/mcp-google-drive:latest
```

**For Linux:**

On Linux, use `--add-host` to add the host IP:

```bash
# Get your host IP
HOST_IP=$(ip route | grep default | awk '{print $3}')

docker run -i --rm \
  --add-host=host.docker.internal:${HOST_IP} \
  -e accessToken \
  -e HTTP_PROXY='http://host.docker.internal:7897' \
  -e HTTPS_PROXY='http://host.docker.internal:7897' \
  peta/mcp-google-drive:latest
```

### Option 3: Use Host Network Mode (Linux only)

```bash
docker run -i --rm \
  --network=host \
  -e accessToken \
  -e HTTP_PROXY='http://127.0.0.1:7897' \
  -e HTTPS_PROXY='http://127.0.0.1:7897' \
  peta/mcp-google-drive:latest
```

**Note:** `--network=host` doesn't work on Docker Desktop for Mac/Windows.

## Configuration for PETA Core

### Without Proxy

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e", "accessToken",
    "peta/mcp-google-drive:latest"
  ],
  "env": {
    "accessToken": "ya29.xxx..."
  }
}
```

### With Proxy (macOS/Windows)

```json
{
  "command": "docker",
  "args": [
    "run",
    "-i",
    "--rm",
    "-e", "accessToken",
    "-e", "HTTP_PROXY",
    "-e", "HTTPS_PROXY",
    "peta/mcp-google-drive:latest"
  ],
  "env": {
    "accessToken": "ya29.xxx...",
    "HTTP_PROXY": "http://host.docker.internal:7897",
    "HTTPS_PROXY": "http://host.docker.internal:7897"
  }
}
```

## Testing

Test without proxy:

```bash
export accessToken='ya29.xxx...'
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker run -i --rm -e accessToken peta/mcp-google-drive:latest
```

Test with proxy:

```bash
export accessToken='ya29.xxx...'
export HTTP_PROXY='http://host.docker.internal:7897'
export HTTPS_PROXY='http://host.docker.internal:7897'

echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | \
  docker run -i --rm \
    -e accessToken \
    -e HTTP_PROXY \
    -e HTTPS_PROXY \
    peta/mcp-google-drive:latest
```

## Summary

| Environment | Proxy Address | Additional Flags |
|-------------|---------------|------------------|
| macOS/Windows | `host.docker.internal:7897` | None |
| Linux | `host.docker.internal:7897` | `--add-host=host.docker.internal:HOST_IP` |
| Linux (host network) | `127.0.0.1:7897` | `--network=host` |
| No proxy | N/A | Don't set HTTP_PROXY/HTTPS_PROXY |
