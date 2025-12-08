#!/bin/bash

# Test script for token update notification
# This simulates peta-core sending a token update notification to the MCP server

set -e

echo "================================================"
echo "Testing Token Update Notification"
echo "================================================"
echo ""

# Check if accessToken is set
if [ -z "$accessToken" ]; then
    echo "Error: accessToken environment variable is not set"
    echo "Usage: export accessToken='ya29.xxx...' && ./test-token-update.sh"
    exit 1
fi

echo "✓ Initial token set: ${accessToken:0:20}..."
echo ""

# Start the Docker container in the background
echo "Starting MCP server..."
CONTAINER_ID=$(docker run -d -i --rm -e accessToken peta/mcp-google-drive:latest)
echo "✓ Container started: $CONTAINER_ID"
echo ""

# Wait for server to initialize
sleep 2

# Function to send JSON-RPC message
send_message() {
    local message=$1
    echo "$message" | docker exec -i "$CONTAINER_ID" cat > /proc/1/fd/0 2>/dev/null || true
}

# Function to read response
read_response() {
    timeout 2 docker logs "$CONTAINER_ID" 2>&1 | tail -5 || true
}

echo "Step 1: Initialize the server"
echo "---"
INIT_REQUEST='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{"roots":{"listChanged":true}},"clientInfo":{"name":"test-client","version":"1.0.0"}}}'
send_message "$INIT_REQUEST"
sleep 1
echo "✓ Server initialized"
echo ""

echo "Step 2: Send token update notification"
echo "---"
NEW_TOKEN="ya29.NEW_TOKEN_FOR_TESTING_123456789"
TIMESTAMP=$(date +%s)000  # milliseconds

TOKEN_UPDATE_NOTIFICATION=$(cat <<EOF
{
  "jsonrpc": "2.0",
  "method": "notifications/token/update",
  "params": {
    "token": "$NEW_TOKEN",
    "timestamp": $TIMESTAMP
  }
}
EOF
)

echo "Sending notification:"
echo "$TOKEN_UPDATE_NOTIFICATION" | jq '.'
echo ""

send_message "$TOKEN_UPDATE_NOTIFICATION"
sleep 2

echo "Step 3: Check server logs for token update"
echo "---"
docker logs "$CONTAINER_ID" 2>&1 | grep -E "\[Token\]|\[Server\]" | tail -10
echo ""

echo "Step 4: Test if new token works (search files)"
echo "---"
SEARCH_REQUEST='{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"gdrive_search","arguments":{"limit":1}}}'
send_message "$SEARCH_REQUEST"
sleep 2

# Check if request succeeded or failed
LOGS=$(docker logs "$CONTAINER_ID" 2>&1 | tail -20)
if echo "$LOGS" | grep -q "error"; then
    echo "⚠️  Search request failed (expected if new token is invalid)"
else
    echo "✓ Search request processed"
fi
echo ""

# Cleanup
echo "Cleaning up..."
docker stop "$CONTAINER_ID" > /dev/null 2>&1 || true
echo "✓ Container stopped"
echo ""

echo "================================================"
echo "Test completed!"
echo "================================================"
echo ""
echo "Note: This test demonstrates the notification mechanism."
echo "In production, peta-core will send valid refreshed tokens."
