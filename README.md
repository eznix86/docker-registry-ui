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

### Multiple Registry Source Support

By default, it supports the env, `REGISTRY_URL` and `REGITRY_AUTH`.

But if you want to add more registries you should add a `postfix` name to the pair for example:

```env
# default
REGISTRY_URL=https://repository.a.com
REGITRY_AUTH=...

# postfixed
REGISTRY_URL_PERSONAL=https://repository.b.com
REGITRY_AUTH_PERSONAL=...

REGISTRY_URL_BUSINESS=https://repository.business.com
REGITRY_AUTH_BUSINESS=...

REGISTRY_URL_ANYNAME=https://repository.whatever.com
REGITRY_AUTH_ANYNAME=...
```

For kubernetes folks, just override `env` value for the values config, for extra ones.

```yaml
# You can rewrite it to envFrom format or this one.
env:
  - name: REGISTRY_URL
    valueFrom:
      secretKeyRef:
        name: registry-ui-secret
        key: url
  - name: REGISTRY_AUTH
    valueFrom:
      secretKeyRef:
        name: registry-ui-secret
        key: auth
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

## Reclaiming Storage

In `registry` v2 or v3, one important detail is often unclear or poorly communicated: **you must manually reclaim storage after deleting an image.**

You might wonder, *“Doesn’t the UI handle that?”* The short answer is **no**. The UI only marks the image as deleted—it doesn’t actually free the space. The registry itself is responsible for completing that process.

Unfortunately, this is a known limitation of the registry. To date, no UI has been able to perform storage reclamation automatically, and I can’t provide that functionality either since the `registry` simply doesn’t support it.

The only option for now is a manual workaround, typically by running garbage collection or other ways. Below are some useful references:

* [Docker Distribution: Garbage Collection - CNCF Explanation](https://distribution.github.io/distribution/about/garbage-collection/)
* [How to Clean Up Container Registry Blobs in Kubernetes - Community](https://thelinuxnotes.com/how-to-cleanup-container-registry-blobs-in-kubernetes-with-garbage-collection/)
* [DigitalOcean: Clean Up Container Registry - Even DigitalOcean has to ducktape](https://docs.digitalocean.com/products/container-registry/how-to/clean-up-container-registry/)
* [Reclaiming Disk Space in a Private Docker Repository - Community](https://dev.to/limal/reclaiming-free-disk-space-from-a-private-docker-repository-30f5)
* [GitHub Issue: Registry Garbage Collection - Github Issue](https://github.com/distribution/distribution/issues/3178)
