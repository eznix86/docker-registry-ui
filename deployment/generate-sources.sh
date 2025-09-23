#!/bin/bash


set -e

SOURCES_FILE="/usr/share/nginx/html/sources.json"
NGINX_TEMPLATE="/etc/nginx/conf.d/nginx.conf.template"
NGINX_CONFIG="/etc/nginx/conf.d/default.conf"
LOCATION_TEMPLATE="/etc/nginx/conf.d/nginx-location.template"

echo "🔧 Generating sources configuration from environment variables..."

echo "{" > "$SOURCES_FILE"

NGINX_PROXY_LOCATIONS=""

FIRST_SOURCE=true

generate_location() {
    local source_key="$1"
    local source_url="$2"
    local source_host="$3"
    local auth_header="$4"

    SOURCE_KEY="$source_key" \
    SOURCE_URL="$source_url" \
    SOURCE_HOST="$source_host" \
    SOURCE_AUTH_HEADER="$auth_header" \
    envsubst '$SOURCE_KEY $SOURCE_URL $SOURCE_HOST $SOURCE_AUTH_HEADER' < "$LOCATION_TEMPLATE"
}

for var in $(printenv | grep "^REGISTRY_URL" | cut -d= -f1); do
    URL=$(printenv "$var")

    if [ -z "$URL" ]; then
        continue
    fi

    SUFFIX=$(echo "$var" | sed 's/REGISTRY_URL//')

    if [ -z "$SUFFIX" ]; then
        SOURCE_KEY="default"
        AUTH_VAR="REGISTRY_AUTH"
    else
        SOURCE_KEY=$(echo "$SUFFIX" | sed 's/^_//' | tr '[:upper:]' '[:lower:]')
        AUTH_VAR="REGISTRY_AUTH$SUFFIX"
    fi

    AUTH=$(printenv "$AUTH_VAR" 2>/dev/null || echo "")

    HOST=$(echo "$URL" | sed 's|^https://||' | sed 's|^http://||' | sed 's|/.*$||')

    # Include subdomain or port information
    if [ "$SOURCE_KEY" != "default" ]; then
        # Extract subdomain/port to make source key more unique for similar domains
        SUBDOMAIN=$(echo "$HOST" | cut -d'.' -f1)
        PORT=$(echo "$HOST" | grep -o ':[0-9]*$' | sed 's/://')

        # If we have a port, include it in the source key
        if [ -n "$PORT" ]; then
            SOURCE_KEY="${SOURCE_KEY}_${PORT}"
        # If subdomain is meaningful (not www), include it
        elif [ "$SUBDOMAIN" != "www" ] && [ "$SUBDOMAIN" != "$SOURCE_KEY" ]; then
            SOURCE_KEY="${SUBDOMAIN}_${SOURCE_KEY}"
        fi
    fi

    if [ -n "$AUTH" ] && [ "$AUTH" != "" ]; then
        AUTH_HEADER="
        proxy_set_header Authorization \"Basic $AUTH\";"
        echo "✅ Found source: $SOURCE_KEY -> $HOST (with auth)"
    else
        AUTH_HEADER=""
        echo "✅ Found source: $SOURCE_KEY -> $HOST (no auth)"
    fi

    if [ "$FIRST_SOURCE" = false ]; then
        echo "," >> "$SOURCES_FILE"
    fi

    echo "  \"$SOURCE_KEY\": {" >> "$SOURCES_FILE"
    echo "    \"path\": \"/api/$SOURCE_KEY\"," >> "$SOURCES_FILE"
    echo "    \"host\": \"$HOST\"" >> "$SOURCES_FILE"
    echo -n "  }" >> "$SOURCES_FILE"

    LOCATION_BLOCK=$(generate_location "$SOURCE_KEY" "$URL" "$HOST" "$AUTH_HEADER")
    NGINX_PROXY_LOCATIONS="${NGINX_PROXY_LOCATIONS}${LOCATION_BLOCK}

"

    FIRST_SOURCE=false
done

# Close sources.json
echo "" >> "$SOURCES_FILE"
echo "}" >> "$SOURCES_FILE"

export NGINX_PROXY_LOCATIONS
envsubst '$NGINX_PROXY_LOCATIONS' < "$NGINX_TEMPLATE" > "$NGINX_CONFIG"

echo ""
echo "Generated sources.json:"
cat "$SOURCES_FILE"

echo ""
echo "Generated nginx configuration:"
cat "$NGINX_CONFIG"

echo ""
echo "✅ Sources generated!"