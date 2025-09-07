FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Set mock environment variables for build
ENV REGISTRY_URL=https://registry-1.docker.io
ENV REGISTRY_AUTH=ZHVtbXk6ZHVtbXk=

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

COPY deployment/nginx.conf.template /etc/nginx/conf.d/nginx.conf.template
COPY deployment/entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

EXPOSE 80

CMD ["/entrypoint.sh"]