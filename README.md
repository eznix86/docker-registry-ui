# Container Hub – Docker Registry UI

A simple, lightweight **UI for exploring and managing Docker/OCI registries**.

![Demo](./docs/images/container-hub.gif)

---

> [!NOTE]
> **v1.0.0** is now available. This is a Go backend, sync engine, themes, and updated UI with helm OCI support. The legacy React frontend (v0.x) is available on the [0.x branch](https://github.com/eznix86/docker-registry-ui/tree/0.x).


## Quick Start

The UI can be deployed in minutes with Docker Compose:

```yaml
services:
  registry-ui:
    image: ghcr.io/eznix86/docker-registry-ui:latest
    ports:
      - "8011:3000"
    environment:
      - REGISTRY_URL=http://your-registry.com:5000
      - REGISTRY_AUTH=base64basicauthhere
```

Then open the UI at: [http://localhost:8011](http://localhost:8011)

For extensive environment customization, see [`.env.example`](./.env.example).

---

## Deployment

### Docker Compose / Swarm

```yaml
services:
  registry-ui:
    image: ghcr.io/eznix86/docker-registry-ui:latest
    ports:
      - "8011:3000"
    environment:
      - REGISTRY_URL=http://your-registry.com:5000
      - REGISTRY_AUTH=base64basicauthhere
```

### Kubernetes (Helm)

```sh
helm repo add docker-registry-ui https://eznix86.github.io/docker-registry-ui
helm repo update

helm install docker-registry-ui docker-registry-ui/docker-registry-ui \
  -n docker-registry-ui \
  --create-namespace
```

#### Creating Registry Secrets

```sh
kubectl create secret generic registry-ui-secret \
  -n docker-registry-ui \
  --from-literal=REGISTRY_URL="http://your-registry.com:5000" \
  --from-literal=REGISTRY_AUTH="$(echo -n 'username:password' | base64)"
```

Reference the secret in your Helm values:

```yaml
secretEnv:
  name: registry-ui-secret
```

For all available configuration options, see [`charts/docker-registry-ui/values.yaml`](./charts/docker-registry-ui/values.yaml).

---

## Authentication

For registries with authentication, you must add the auth environment variable as a base64 encoded value of `username:password`

```bash
echo -n "username:password" | base64
# dXNlcm5hbWU6cGFzc3dvcmQ=
```

Afterwards, use this value through the following environment variables:

```bash
REGISTRY_URL=https://registry.test
REGISTRY_AUTH=dXNlcm5hbWU6cGFzc3dvcmQ=
```

---

## Multiple Registry Support

The UI supports connections to multiple registries. Configure them via environment variables with suffixes:

```env
# Default registry
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

Notes:

* From `v0.3.2`, `REGISTRY_AUTH` (or its suffixed variants) can be omitted for unauthenticated registries.
* From `v0.5.0`, GitHub Container Registry is supported:

  ```env
  REGISTRY_URL_GHCR=https://ghcr.io
  REGISTRY_AUTH_GHCR=base64(github-username:PAT)
  ```

  The PAT requires `delete:packages, repo, write:packages` permissions. [Generate a PAT](https://github.com/settings/tokens).

---

## Development

To contribute, set up a local development environment:

```sh
# Prepare environment variables
cp .env.example .env
# Example: echo -n "USERNAME:PASSWORD" | base64 > .env

bun install
bun run dev         # start local dev server
bun run lint        # run linter
bun run lint:fix    # auto-fix linting issues where possible
```

Pull requests are welcome. Please ensure code is linted and tested before submission.

---

## Storage Reclamation

When deleting images, Docker Registry **v2/v3** only marks them as deleted. Disk space is not automatically reclaimed.

Use the [Docker Registry Cleaner](https://github.com/eznix86/docker-registry-cleaner) for automated cleanup, or run garbage collection manually:

```sh
# Run garbage collection
bin/registry garbage-collect --delete-untagged /etc/docker/registry/config.yml

# Optionally, remove an entire repository manually
rm -rf /var/lib/registry/docker/registry/v2/repositories/<repository_name>
```

Further reading:

* [Docker Distribution: Garbage Collection](https://distribution.github.io/distribution/about/garbage-collection/)
* [Cleaning Up Registry Blobs in Kubernetes](https://thelinuxnotes.com/how-to-cleanup-container-registry-blobs-in-kubernetes-with-garbage-collection/)
* [DigitalOcean: Clean Up Container Registry](https://docs.digitalocean.com/products/container-registry/how-to/clean-up-container-registry/)
* [Community Guide: Reclaiming Disk Space](https://dev.to/limal/reclaiming-free-disk-space-from-a-private-docker-repository-30f5)
* [GitHub Issue: Registry Garbage Collection](https://github.com/distribution/distribution/issues/3178)

---

## How to Contribute

Contributions are welcome. Whether you want to fix a bug, improve performance, or add a new feature, here’s how to get started.

### 1. Fork and Clone

```sh
git clone https://github.com/<your-username>/docker-registry-ui.git
cd docker-registry-ui
```

### 2. Create a Branch

```sh
git checkout -b feature/your-feature-name
```

Use a descriptive branch name, for example `fix/tag-pagination` or `feature/multi-registry-auth`.

### 3. Set Up the Environment

```sh
cp .env.example .env
bun install
bun run dev
```

### 4. Lint and Test Before Submitting

```sh
bun run lint
bun run lint:fix
```

Ensure your code passes all checks before committing.

### 5. Commit and Push

```sh
git commit -m "feat: add registry pagination support"
git push origin feature/your-feature-name
```

### 6. Open a Pull Request

Open a pull request to the `main` branch

Please include:

* A clear description of what your change does.
* Screenshots or examples if relevant.
* Links to related issues, for example `Fixes #28`.

---

### Contribution Guidelines

* Follow the existing code style and linting rules.
* Keep commits small and descriptive.
* Document any new features or configuration options.
* Pick any issue listed.
* Open an issue before contributing

---

## License

This project is licensed under the **GNU Affero General Public License v3.0**. See the [`LICENSE`](./LICENSE) file for details.
