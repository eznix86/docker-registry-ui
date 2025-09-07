#!/bin/sh

# Extract hostname from REGISTRY_URL (handles both http and https)
REGISTRY_HOST=$(echo "${REGISTRY_URL}" | sed 's|https\?://||' | sed 's|/.*||')
export REGISTRY_HOST

envsubst '${REGISTRY_URL} ${REGISTRY_AUTH} ${REGISTRY_HOST}' < /etc/nginx/conf.d/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'