FROM oven/bun:1.3.13 AS frontend-builder

WORKDIR /build

COPY package.json ./

RUN bun install --frozen-lockfile

COPY resources ./resources
COPY tsconfig.json vite.config.ts ./

RUN bun run build

FROM golang:1.26-alpine AS backend-builder

RUN apk add --no-cache git gcc musl-dev ca-certificates tzdata

WORKDIR /build

COPY go.mod go.sum ./
RUN go mod download

COPY . .

COPY --from=frontend-builder /build/public/build ./public/build

ARG VERSION
ARG GIT_COMMIT
ARG BUILD_DATE

RUN CGO_ENABLED=1 go build \
    -ldflags "-X github.com/eznix86/docker-registry-ui/internal/version.Version=${VERSION} \
    -X github.com/eznix86/docker-registry-ui/internal/version.GitCommit=${GIT_COMMIT} \
    -X github.com/eznix86/docker-registry-ui/internal/version.BuildTime=${BUILD_DATE} \
    -w -s" \
    -trimpath \
    -o container-hub \
    ./cmd/container-hub

FROM alpine:3.23

WORKDIR /app

COPY --from=backend-builder /build/container-hub .
COPY --from=backend-builder /build/resources/views ./resources/views

RUN mkdir -p /app/data && chown nobody:nobody /app/data

USER nobody

EXPOSE 3000

ENTRYPOINT ["/app/container-hub"]
CMD ["start", "-v", "--sync-interval=1h"]
