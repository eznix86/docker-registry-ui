# SPDX-License-Identifier: AGPL-3.0-or-later
# Copyright (C) 2025  Bruno Bernard
#
# This file is part of Docker Registry UI (Container Hub).
#
# Docker Registry UI is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
#
# Docker Registry UI is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <https://www.gnu.org/licenses/>.

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
