# SPDX-License-Identifier: Apache-2.0
# Copyright (C) 2025  Bruno Bernard

FROM oven/bun:alpine AS frontend

WORKDIR /frontend


COPY package.json bun.lock vite.config.ts ./
RUN bun install --frozen-lockfile

COPY resources/ ./resources/

RUN bun run build

FROM golang:1.25-alpine AS backend

WORKDIR /app

ENV GOCACHE=/go-cache
ENV GOMODCACHE=/gomod-cache
ENV CGO_ENABLED=1

RUN apk add --no-cache gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
COPY --from=frontend /frontend/public ./public

RUN --mount=type=cache,target=/gomod-cache \
    --mount=type=cache,target=/go-cache \
    go build \
    -ldflags="-s -w -linkmode external -extldflags '-static'" \
    -o ./bin/ui \
    ./cmd/web

FROM busybox:uclibc

WORKDIR /app

COPY --from=backend /app/bin/ui .

EXPOSE 3000
CMD ["./ui", "serve"]
