#!/bin/bash

# Default to port 80 if $PORT is not set (local dev)
export PORT=${PORT:-80}
echo "🚀 Starting monolith on port $PORT"

# Replace ${PORT} placeholder in Nginx config
envsubst '${PORT}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf

# Create necessary log directories
mkdir -p /var/log/supervisor
mkdir -p /var/log/nginx

# Start Supervisord
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
