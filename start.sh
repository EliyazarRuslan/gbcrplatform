#!/bin/bash
echo "Starting GBCR Platform..."
node server.js &
SOCKET_PID=$!
echo "Socket.io server started (PID: $SOCKET_PID)"
npx next dev -H 0.0.0.0
kill $SOCKET_PID 2>/dev/null
