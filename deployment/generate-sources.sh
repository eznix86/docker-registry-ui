#!/bin/bash

# Script to generate sources.json from environment variables
# This script reads REGISTRY_URL* and REGISTRY_AUTH* pairs and generates sources configuration

set -e

SOURCES_FILE="/usr/share/nginx/html/sources.json"
NGINX_TEMPLATE="/etc/nginx/conf.d/nginx.conf.template"
NGINX_CONFIG="/etc/nginx/conf.d/default.conf"

echo "🔧 Generating sources configuration from environment variables..."

echo "{" > "$SOURCES_FILE"

# Start building the nginx locations content
NGINX_LOCATIONS=""

FIRST_SOURCE=true

for var in $(printenv | grep "^REGISTRY_URL" | cut -d= -f1); do
    URL=$(printenv "$var")
    
    SUFFIX=$(echo "$var" | sed 's/REGISTRY_URL//')
    
    if [ -z "$SUFFIX" ]; then
        SOURCE_KEY="default"
        AUTH_VAR="REGISTRY_AUTH"
    else
        SOURCE_KEY=$(echo "$SUFFIX" | sed 's/^_//' | tr '[:upper:]' '[:lower:]')
        AUTH_VAR="REGISTRY_AUTH$SUFFIX"
    fi
    
    AUTH=$(printenv "$AUTH_VAR" || echo "")
    
    if [ -n "$URL" ] && [ -n "$AUTH" ]; then
        # Extract hostname from URL
        HOST=$(echo "$URL" | sed 's|https\?://||' | sed 's|/.*||')
        
        echo "✅ Found source: $SOURCE_KEY -> $HOST"
        
        if [ "$FIRST_SOURCE" = false ]; then
            echo "," >> "$SOURCES_FILE"
        fi
        
        echo "  \"$SOURCE_KEY\": {" >> "$SOURCES_FILE"
        echo "    \"path\": \"/api/$SOURCE_KEY\"," >> "$SOURCES_FILE"
        echo "    \"host\": \"$HOST\"" >> "$SOURCES_FILE"
        echo -n "  }" >> "$SOURCES_FILE"
        
        # Add location block to nginx locations
        NGINX_LOCATIONS="${NGINX_LOCATIONS}
    # Proxy for source: $SOURCE_KEY ($HOST)
    location /api/$SOURCE_KEY/ {
        # Remove /api/$SOURCE_KEY from the path when proxying
        rewrite ^/api/$SOURCE_KEY/(.*)$ /\$1 break;

        proxy_pass $URL;
        proxy_set_header Host $HOST;
        proxy_set_header Authorization \"Basic $AUTH\";
        proxy_pass_request_headers on;

        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;

        proxy_redirect off;
        proxy_buffering off;
        proxy_ssl_server_name on;
    }
"
        FIRST_SOURCE=false
    else
        echo "⚠️  Skipping $SOURCE_KEY: Missing URL or AUTH"
    fi
done

# Close sources.json
echo "" >> "$SOURCES_FILE"
echo "}" >> "$SOURCES_FILE"

# Create nginx configuration by writing locations to temp file and substituting
TEMP_LOCATIONS_FILE="/tmp/nginx_locations.tmp"
echo "$NGINX_LOCATIONS" > "$TEMP_LOCATIONS_FILE"

# Copy template and replace the placeholder line with the locations
awk '
/# Registry proxy locations will be inserted here by generate-sources.sh/ {
    system("cat /tmp/nginx_locations.tmp")
    next
}
{ print }
' "$NGINX_TEMPLATE" > "$NGINX_CONFIG"

rm "$TEMP_LOCATIONS_FILE"

echo "Generated sources.json:"
cat "$SOURCES_FILE"

echo ""
echo "Generated nginx configuration:"
cat "$NGINX_CONFIG"

echo ""
echo "✅ Sources generated!"