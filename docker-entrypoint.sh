#!/usr/bin/env bash
set -euo pipefail

# Render provides PORT; substitute it into nginx config.
envsubst '$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf

# Start the backend and frontend servers.
uvicorn app.main:app --host 127.0.0.1 --port 8000 &
UVICORN_PID=$!

nginx -g 'daemon off;' &
NGINX_PID=$!

# Wait for either service to exit; if one stops, shut down the other.
wait -n "$UVICORN_PID" "$NGINX_PID"
kill -TERM "$UVICORN_PID" "$NGINX_PID" 2>/dev/null || true
exit 1
