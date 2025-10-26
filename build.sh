#!/usr/bin/env bash

echo "Building Docker Registry UI..."

export VERSION="$(git describe --tags --always --abbrev=0 --match='v[0-9]*.[0-9]*.[0-9]*' 2> /dev/null | sed 's/^.//')"
export COMMIT_HASH="$(git rev-parse --short HEAD)"
export BUILD_TIMESTAMP=$(date '+%Y-%m-%dT%H:%M:%S')

echo "Version: ${VERSION}"
echo "Commit Hash: ${COMMIT_HASH}"
echo "Build Timestamp: ${BUILD_TIMESTAMP}"

echo "Building dev binary..."

go build -ldflags "-X main.Version=$VERSION -X main.CommitHash=$COMMIT_HASH -X main.BuildTimestamp=$BUILD_TIMESTAMP" -o ./bin/dev .
