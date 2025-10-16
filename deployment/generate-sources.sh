#!/bin/bash


set -e

SOURCES_FILE="/usr/share/nginx/html/sources.json"
NGINX_TEMPLATE="/etc/nginx/conf.d/nginx.conf.template"
NGINX_CONFIG="/etc/nginx/conf.d/default.conf"
LOCATION_TEMPLATE="/etc/nginx/conf.d/nginx-location.template"
GITHUB_TEMPLATE="/etc/nginx/conf.d/nginx-github.template"

echo "🔧 Generating sources configuration from environment variables..."

echo "{" > "$SOURCES_FILE"

NGINX_PROXY_LOCATIONS=""

FIRST_SOURCE=true

generate_location() {
    local source_key="$1"
    local source_url="$2"
    local source_host="$3"
    local auth_header="$4"
    local is_github="$5"
    local github_auth_header="$6"

    if [ "$is_github" = true ]; then
        # Use GitHub template for GitHub registries
        SOURCE_KEY="$source_key" \
        SOURCE_URL="$source_url" \
        SOURCE_HOST="$source_host" \
        SOURCE_AUTH_HEADER="$auth_header" \
        GITHUB_AUTH_HEADER="$github_auth_header" \
        envsubst '$SOURCE_KEY $SOURCE_URL $SOURCE_HOST $SOURCE_AUTH_HEADER $GITHUB_AUTH_HEADER' < "$GITHUB_TEMPLATE"
    fi

    # Always include standard location block
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

    # Detect if this is a GitHub registry
    IS_GITHUB_REGISTRY=false
    if echo "$HOST" | grep -q "ghcr.io"; then
        IS_GITHUB_REGISTRY=true
    fi

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
        if [ "$IS_GITHUB_REGISTRY" = true ]; then
            # For GitHub, extract password from base64 username:password for authentication
            DECODED_AUTH=$(echo "$AUTH" | base64 -d)
            if echo "$DECODED_AUTH" | grep -q ":"; then
                GITHUB_PASSWORD=$(echo "$DECODED_AUTH" | cut -d':' -f2)
            else
                GITHUB_PASSWORD="$DECODED_AUTH"
            fi
            # GitHub uses Bearer tokens - password for API, base64(password) for v2
            GITHUB_PASSWORD_B64=$(echo -n "$GITHUB_PASSWORD" | base64 | tr -d '\n')

            # Docker Registry v2 auth for ghcr.io/v2 - Bearer with base64 password
            AUTH_HEADER="
        proxy_set_header Authorization \"Bearer $GITHUB_PASSWORD_B64\";"
            # GitHub API auth for api.github.com - Bearer with raw password
            GITHUB_AUTH_HEADER="
        proxy_set_header Authorization \"Bearer $GITHUB_PASSWORD\";
        proxy_set_header User-Agent \"container-registry-ui\";"
            echo "✅ Found GitHub source: $SOURCE_KEY -> $HOST (with auth)"
        else
            AUTH_HEADER="
        proxy_set_header Authorization \"Basic $AUTH\";"
            GITHUB_AUTH_HEADER=""
            echo "✅ Found source: $SOURCE_KEY -> $HOST (with auth)"
        fi
    else
        AUTH_HEADER=""
        GITHUB_AUTH_HEADER=""
        if [ "$IS_GITHUB_REGISTRY" = true ]; then
            echo "✅ Found GitHub source: $SOURCE_KEY -> $HOST (no auth)"
        else
            echo "✅ Found source: $SOURCE_KEY -> $HOST (no auth)"
        fi
    fi

    if [ "$FIRST_SOURCE" = false ]; then
        echo "," >> "$SOURCES_FILE"
    fi

    echo "  \"$SOURCE_KEY\": {" >> "$SOURCES_FILE"
    echo "    \"path\": \"/api/$SOURCE_KEY\"," >> "$SOURCES_FILE"

    # Add username for GitHub registries
    if [ "$IS_GITHUB_REGISTRY" = true ] && [ -n "$AUTH" ] && [ "$AUTH" != "" ]; then
        DECODED_AUTH=$(echo "$AUTH" | base64 -d)
        if echo "$DECODED_AUTH" | grep -q ":"; then
            GITHUB_USERNAME=$(echo "$DECODED_AUTH" | cut -d':' -f1)
        else
            GITHUB_USERNAME="unknown"
        fi
        echo "    \"host\": \"$HOST\"," >> "$SOURCES_FILE"
        echo "    \"username\": \"$GITHUB_USERNAME\"" >> "$SOURCES_FILE"
    else
        echo "    \"host\": \"$HOST\"" >> "$SOURCES_FILE"
    fi

    echo -n "  }" >> "$SOURCES_FILE"

    LOCATION_BLOCK=$(generate_location "$SOURCE_KEY" "$URL" "$HOST" "$AUTH_HEADER" "$IS_GITHUB_REGISTRY" "$GITHUB_AUTH_HEADER")
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
cat $NGINX_CONFIG | sed -E 's/(Basic|Bearer) [A-Za-z0-9+\/=]+/\1 \*\*\*/g'

echo ""
echo "✅ Sources generated!"
