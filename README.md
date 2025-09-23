
# Container Hub – Docker Registry UI

A simple, lightweight **UI for exploring and managing Docker/OCI container registries**.

![Demo](./docs/images/container-hub.gif)

---

## Quick Start

```yaml
services:
  registry-ui:
    image: ghcr.io/eznix86/docker-registry-ui:latest
    ports:
      - "8011:80"
    environment:
      - REGISTRY_URL=http://your-registry.com:5000
      - REGISTRY_AUTH=base64basicauthhere
````

Then open: [http://localhost:8011](http://localhost:8011)

---

## Deployment

### Docker Compose / Swarm

```yaml
services:
  registry-ui:
    image: ghcr.io/eznix86/docker-registry-ui:latest
    ports:
      - "8011:80"
    environment:
      - REGISTRY_URL=http://your-registry.com:5000
      - REGISTRY_AUTH=base64basicauthhere
```

### Kubernetes (via Helm)

```sh
helm repo add docker-registry-ui https://eznix86.github.io/docker-registry-ui
helm repo update

helm install docker-registry-ui docker-registry-ui/docker-registry-ui \
  -n docker-registry-ui \
  --create-namespace
```

#### Creating Secrets

```sh
kubectl create secret generic registry-ui-secret \
  -n docker-registry-ui \
  --from-literal=url="http://your-registry.com:5000" \
  --from-literal=auth="$(echo -n 'username:password' | base64)"
```

Then reference the secret in your Helm values:

```yaml
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

---

## Multiple Registry Support

You can connect to multiple registries by adding **suffix environment variables**:

```env
# Default
REGISTRY_URL=https://repository.a.com
REGISTRY_AUTH=...

# Additional registries
REGISTRY_URL_PERSONAL=https://repository.b.com
REGISTRY_AUTH_PERSONAL=...

REGISTRY_URL_BUSINESS=https://repository.business.com
REGISTRY_AUTH_BUSINESS=...

REGISTRY_URL_CUSTOM=https://repository.whatever.com
REGISTRY_AUTH_CUSTOM=...
```

For Kubernetes, extend the `env` configuration in your Helm values.

As of `v0.3.2`, the env `REGISTRY_AUTH` or `REGISTRY_AUTH_<SUFFIX>` can be omitted for no auth registries

As of `v0.5.0`, Github Container Registry is supported. Use `REGISTRY_URL_XXX="https://ghcr.io"` and `REGISTRY_AUTH_XXX="base64 of github-username:PAT"` where the [PAT (Personal Access Token)](https://github.com/settings/tokens) has the `delete:packages, repo, write:packages` permissions.

---

## Contributing

```sh
# Setup .env
# Example: echo -n "USERNAME:PASSWORD" | base64
cp .env.example .env

bun install
bun run dev         # start development
bun run lint        # lint code
bun run lint:fix    # auto-fix lint issues where possible
```

---

## Reclaiming Storage

In Docker Registry **v2/v3**, deleting an image through the UI only *marks* it as deleted — the storage is **not automatically reclaimed**.

To free disk space, you must run the registry’s built-in **garbage collection** or other cleanup processes.

```sh
# Do this inside of your registry container.
bin/registry garbage-collect [--dry-run] [--delete-untagged] [--quiet] /path/to/config.yml
# Example:
# To run the garbage collector. 
# bin/registry garbage-collect --delete-untagged /etc/docker/registry/config.yml
# To delete the repository itself.
# rm -rf /var/lib/registry/docker/registry/v2/repositories/<registry_name>
```

Useful references:

* [Docker Distribution: Garbage Collection](https://distribution.github.io/distribution/about/garbage-collection/)
* [Cleaning Up Registry Blobs in Kubernetes](https://thelinuxnotes.com/how-to-cleanup-container-registry-blobs-in-kubernetes-with-garbage-collection/)
* [DigitalOcean: Clean Up Container Registry](https://docs.digitalocean.com/products/container-registry/how-to/clean-up-container-registry/)
* [Community Guide: Reclaiming Disk Space](https://dev.to/limal/reclaiming-free-disk-space-from-a-private-docker-repository-30f5)
* [GitHub Issue: Registry Garbage Collection](https://github.com/distribution/distribution/issues/3178)
