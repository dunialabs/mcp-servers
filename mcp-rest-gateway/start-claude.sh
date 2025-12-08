#!/bin/bash
# Startup script for Claude Desktop integration

cd "$(dirname "$0")"

# Load environment file (priority: .env > .env.test)
ENV_FILE="${1:-.env}"

if [ ! -f "$ENV_FILE" ]; then
    if [ -f ".env.test" ]; then
        ENV_FILE=".env.test"
        echo "Using default test config: .env.test" >&2
    else
        echo "Error: No environment file found (.env or .env.test)" >&2
        exit 1
    fi
fi

# Export environment variables
set -a  # automatically export all variables
source "$ENV_FILE"
set +a  # stop automatically exporting

# Start the gateway server
exec node dist/stdio.js
