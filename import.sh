#!/usr/bin/env bash
set -eo pipefail

if [[ -z ${1:-} || -z ${2:-} || -z ${3:-} ]]; then
    cat <<EOF
Usage: 
    $0 "library/nginx" "<link-repository>" "<amount>"
EOF
    exit 1
fi


SRC_REPO="docker://docker.io/$1"

DEST_REPO="docker://$2/$1"

ARCH="amd64"

OS="linux"

LIMIT=$3

# Get tags from Docker Hub API (sorted by recent, paginated)
echo "Fetching latest $LIMIT tags from $1..."
TAGS=$(curl -s "https://registry.hub.docker.com/v2/repositories/$1/tags?page_size=$LIMIT" \
    | jq -r '.results[].name')



for TAG in $TAGS; do
    echo "Copying: $SRC_REPO:$TAG -> $DEST_REPO:$TAG (arch: $OS/$ARCH)"
    
    skopeo copy --override-arch "$ARCH" --override-os "$OS" "$SRC_REPO:$TAG" "$DEST_REPO:$TAG"
done

echo "✅ Done copying $LIMIT tags for $1."
