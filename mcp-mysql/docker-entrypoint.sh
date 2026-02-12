#!/bin/sh
set -e

#
# Docker Entrypoint Script for MySQL MCP Server
#
# This script:
# 1. Validates required environment variables
# 2. Automatically remaps localhost for Docker containers
# 3. Uses exec to replace shell with node process (for signal forwarding)
#

# ============================================
# Environment Variable Validation
# ============================================

if [ -z "$MYSQL_URL" ]; then
    echo "ERROR: MYSQL_URL environment variable is required" >&2
    echo "Example: mysql://user:password@localhost:3306/database" >&2
    exit 1
fi

# ============================================
# Automatic Localhost Remapping for Docker
# ============================================

if echo "$MYSQL_URL" | grep -q "localhost"; then
    echo "INFO: Detected 'localhost' in MYSQL_URL, applying automatic remapping..." >&2

    DOCKER_HOST=""

    if ping -c 1 -w 1 host.docker.internal >/dev/null 2>&1; then
        DOCKER_HOST="host.docker.internal"
        echo "INFO: Docker Desktop detected, remapping localhost to host.docker.internal" >&2
    elif ping -c 1 -w 1 172.17.0.1 >/dev/null 2>&1; then
        DOCKER_HOST="172.17.0.1"
        echo "INFO: Linux Docker detected, remapping localhost to 172.17.0.1" >&2
    else
        echo "WARNING: Cannot determine Docker host IP, keeping localhost (connection may fail)" >&2
        DOCKER_HOST="localhost"
    fi

    if [ "$DOCKER_HOST" != "localhost" ]; then
        MYSQL_URL=$(echo "$MYSQL_URL" | sed "s/localhost/$DOCKER_HOST/g")
        echo "INFO: Remapped MYSQL_URL for Docker environment" >&2
    fi

    export MYSQL_URL
fi

# ============================================
# Set Defaults
# ============================================

LOG_LEVEL="${LOG_LEVEL:-INFO}"

# ============================================
# Display Configuration
# ============================================

echo "=== MySQL MCP Server ===" >&2
echo "Log Level: $LOG_LEVEL" >&2
echo "Node Version: $(node --version)" >&2
echo "========================" >&2
echo "" >&2

# ============================================
# Start Server
# ============================================

exec node dist/index.js "$@"
