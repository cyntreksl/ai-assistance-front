#!/bin/sh
set -eu

escape_javascript_string() {
    printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

api_url=$(escape_javascript_string "${VITE_RAG_API_URL:-http://localhost:9000}")
api_key=$(escape_javascript_string "${VITE_RAG_API_KEY:-change-me}")
tenant_id=$(escape_javascript_string "${VITE_RAG_TENANT_ID:-jobbazaar}")
user_id=$(escape_javascript_string "${VITE_RAG_USER_ID:-user-1}")

printf 'window.__RAG_CONFIG__ = {\n  apiUrl: "%s",\n  apiKey: "%s",\n  tenantId: "%s",\n  userId: "%s"\n};\n' \
    "$api_url" "$api_key" "$tenant_id" "$user_id" \
    > /usr/share/nginx/html/env.js
