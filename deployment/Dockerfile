FROM oven/bun:1.3.1-alpine AS builder

LABEL org.opencontainers.image.source=https://github.com/eznix86/docker-registry-ui
LABEL org.opencontainers.image.description="Container for Docker Registry UI"

WORKDIR /app

COPY package.json bun.lock* ./

RUN bun install --frozen-lockfile

COPY . .

RUN bun run build

FROM nginx:1.29.3-alpine-slim

LABEL org.opencontainers.image.source=https://github.com/eznix86/docker-registry-ui
LABEL org.opencontainers.image.description="Container for Docker Registry UI"

RUN apk add --no-cache bash

COPY --from=builder /app/dist /usr/share/nginx/html

COPY deployment/nginx.conf.template /etc/nginx/conf.d/nginx.conf.template
COPY deployment/nginx-location.template /etc/nginx/conf.d/nginx-location.template
COPY deployment/nginx-github.template /etc/nginx/conf.d/nginx-github.template

COPY deployment/generate-sources.sh /generate-sources.sh
COPY deployment/entrypoint.sh /entrypoint.sh

RUN chmod +x /generate-sources.sh /entrypoint.sh

RUN rm /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/entrypoint.sh"]