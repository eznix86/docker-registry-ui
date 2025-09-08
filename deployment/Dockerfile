FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine

RUN apk add --no-cache bash

COPY --from=builder /app/dist /usr/share/nginx/html

COPY deployment/nginx.conf.template /etc/nginx/conf.d/nginx.conf.template

COPY deployment/generate-sources.sh /generate-sources.sh
COPY deployment/entrypoint.sh /entrypoint.sh

RUN chmod +x /generate-sources.sh /entrypoint.sh

RUN rm /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["/entrypoint.sh"]