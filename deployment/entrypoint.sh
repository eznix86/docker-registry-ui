#!/bin/sh

set -e

echo "Starting Docker Registry UI..."

REGISTRY_COUNT=$(printenv | grep -c "^REGISTRY_URL" || echo "0")

if [ "$REGISTRY_COUNT" -eq "0" ]; then
    echo "❌ Error: No REGISTRY_URL environment variables found!"
    echo "   Please set at least REGISTRY_URL and REGISTRY_AUTH"
    echo "   For multiple sources, use REGISTRY_URL_SOURCENAME and REGISTRY_AUTH_SOURCENAME"
    exit 1
fi

echo "Found $REGISTRY_COUNT registry source(s)"

echo "🔧 Generating multi-source configuration..."
/generate-sources.sh

echo "✅ Multi-source configuration complete!"
echo "🌐 Starting nginx..."

exec nginx -g 'daemon off;'