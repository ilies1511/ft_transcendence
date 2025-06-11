#!/bin/sh
set -e

# Installiere nur, falls node_modules leer oder fehlend
if [ ! -d "node_modules" ] || [ -z "$(ls -A node_modules)" ]; then
  echo "🔄 Installing npm dependencies..."
  npm ci
else
  echo "✅ node_modules already present, skipping npm install"
fi

# now CMD command (Default: "sh", in CMD)
exec "$@"
