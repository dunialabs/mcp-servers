#!/bin/sh
set -e

#
# Docker Entrypoint Script for PostgreSQL MCP Server
#
# This script:
# 1. Validates required environment variables
# 2. Automatically remaps localhost for Docker containers
# 3. Sets up proper defaults
# 4. Uses exec to replace shell with node process (for signal forwarding)
#

# ============================================
# Environment Variable Validation
# ============================================

if [ -z "$POSTGRES_URL" ]; then
    echo "ERROR: POSTGRES_URL environment variable is required" >&2
    echo "Example: postgresql://user:password@localhost:5432/database" >&2
    exit 1
fi

# ============================================
# Automatic Localhost Remapping for Docker
# ============================================
# The Docker image automatically remaps 'localhost' to work from inside the container:
# - MacOS/Windows: Uses host.docker.internal
# - Linux: Uses 172.17.0.1 or the appropriate host address
#
# This allows users to use the same connection string across all platforms.

if echo "$POSTGRES_URL" | grep -q "localhost"; then
    echo "INFO: Detected 'localhost' in POSTGRES_URL, applying automatic remapping..." >&2

    # Determine Docker host address by testing connectivity
    DOCKER_HOST=""

    # Try Docker Desktop address first (MacOS/Windows)
    if ping -c 1 -w 1 host.docker.internal >/dev/null 2>&1; then
        DOCKER_HOST="host.docker.internal"
        echo "INFO: Docker Desktop detected, remapping localhost to host.docker.internal" >&2
    # Try Linux Docker default gateway
    elif ping -c 1 -w 1 172.17.0.1 >/dev/null 2>&1; then
        DOCKER_HOST="172.17.0.1"
        echo "INFO: Linux Docker detected, remapping localhost to 172.17.0.1" >&2
    else
        echo "WARNING: Cannot determine Docker host IP, keeping localhost (connection may fail)" >&2
        DOCKER_HOST="localhost"
    fi

    # Replace localhost with Docker host
    if [ "$DOCKER_HOST" != "localhost" ]; then
        POSTGRES_URL=$(echo "$POSTGRES_URL" | sed "s/localhost/$DOCKER_HOST/g")
        echo "INFO: Remapped POSTGRES_URL for Docker environment" >&2
    fi

    export POSTGRES_URL
fi

# ============================================
# Set Defaults
# ============================================

# Access mode (readonly or readwrite)
ACCESS_MODE="${ACCESS_MODE:-readonly}"
if [ "$ACCESS_MODE" != "readonly" ] && [ "$ACCESS_MODE" != "readwrite" ]; then
    echo "ERROR: ACCESS_MODE must be 'readonly' or 'readwrite', got: $ACCESS_MODE" >&2
    exit 1
fi

# Log level
LOG_LEVEL="${LOG_LEVEL:-INFO}"

# ============================================
# Display Configuration
# ============================================

echo "=== PostgreSQL MCP Server ===" >&2
echo "Access Mode: $ACCESS_MODE" >&2
echo "Log Level: $LOG_LEVEL" >&2
echo "Node Version: $(node --version)" >&2
echo "=============================" >&2
echo "" >&2

# ============================================
# Start Server
# ============================================

# CRITICAL: Use exec to replace shell process with node
# This ensures:
# 1. Node.js becomes PID 1 (or controlled by dumb-init)
# 2. Signals (SIGTERM/SIGINT) are forwarded directly to node
# 3. Container exits when node exits
exec node dist/index.js "$@"
