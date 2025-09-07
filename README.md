# Container Hub - Docker Registry UI

Docker Registry UI for exploring and managing container repositories

![Gif](./docs/images/container-hub.gif)

## Deployment

### Docker Compose / Swarm

```yaml
services:
  register-ui:
    image: ghcr.io/eznix86/docker-registry-ui: latest
    ports:
      - "8011:80"
    environment:
        - REGISTRY_URL=http://your-registry.com:5000
        - REGITRY_AUTH=basicAuthhere
```

### Kubernetes

```sh
helm repo add docker-registry-ui https://eznix86.github.io/docker-registry-ui
helm repo update
helm install docker-registry-ui docker-registry-ui/docker-registry-ui \
    -n docker-registry-ui \
    --create-namespace

# Add your secrets, but you can still override it with your values.yaml
kubectl create secret generic registry-ui-secret \
    -n docker-registry-ui
    --from-literal=url="http://your-registry.com:5000" \
    --from-literal=auth="$(echo -n 'username:password' | base64)"
```

## Contributing

```sh
# Setup .env
# Use echo -n "USERNAME:PASSSWORD" | base64
cp .env.example .env

npm install
npm run dev # to run development
npm run lint # to lint code
npm run lint:fix # to fix the lint where possible.
```
