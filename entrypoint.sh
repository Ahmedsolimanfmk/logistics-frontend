#!/bin/sh
set -e

# Replace placeholder in public/env.js with runtime env var
if [ -n "$NEXT_PUBLIC_API_BASE" ] && [ -f "/app/public/env.js" ]; then
  sed -i "s|__NEXT_PUBLIC_API_BASE__|$NEXT_PUBLIC_API_BASE|g" /app/public/env.js
fi

exec "$@"
