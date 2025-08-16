#!/usr/bin/env bash
set -e

cd /app/core

check_not_empty() { [ -d "$1" ] && [ "$(ls -A "$1")" ]; }

need_install=false
for d in ./node_modules ./frontend/node_modules ./backend/node_modules; do
  if ! check_not_empty "$d"; then
    need_install=true
    break
  fi
done

if $need_install; then
  echo "⏳ Installing dependencies (make modules)…"
  make modules
fi

echo "🚀 Starting dev servers (make run)…"
( make run ) & # run backend + frontend in the background

exec bash
