# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.13 AS frontend-builder

WORKDIR /build

COPY package.json bun.lock ./

RUN --mount=type=cache,target=/root/.bun/install/cache \
    bun install --frozen-lockfile

COPY resources ./resources
COPY tsconfig.json vite.config.ts ./

RUN bun run build

FROM golang:1.26-alpine AS backend-builder

RUN apk add --no-cache gcc musl-dev ca-certificates

WORKDIR /build

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download

COPY cmd ./cmd
COPY internal ./internal
COPY assets.go ./
COPY public ./public
COPY resources/views ./resources/views

COPY --from=frontend-builder /build/public/build ./public/build

ARG VERSION
ARG GIT_COMMIT
ARG BUILD_DATE

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=1 go build \
    -ldflags "-X github.com/eznix86/docker-registry-ui/internal/version.Version=${VERSION} \
    -X github.com/eznix86/docker-registry-ui/internal/version.GitCommit=${GIT_COMMIT} \
    -X github.com/eznix86/docker-registry-ui/internal/version.BuildTime=${BUILD_DATE} \
    -w -s" \
    -trimpath \
    -o container-hub \
    ./cmd/container-hub

FROM alpine:3.23

RUN apk add --no-cache ca-certificates

WORKDIR /app

COPY --from=backend-builder --chown=nobody:nobody /build/container-hub .

RUN install -d -o nobody -g nobody /app/data

USER nobody

EXPOSE 3000

ENTRYPOINT ["/app/container-hub"]
CMD ["start", "-v", "--sync-interval=1h"]
