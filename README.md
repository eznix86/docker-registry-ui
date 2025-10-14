# Container Hub – Docker Registry UI

A simple, lightweight **UI for exploring and managing Docker/OCI container registries**.

![Demo](./docs/images/container-hub.gif)

---

> [!IMPORTANT]
> I’m currently working towards the upcoming **`v1.0.0`** release. While the current version works well, it doesn’t scale efficiently—even for relatively small projects (e.g., repositories with 100+ tags).
>
> To address this, I’ve opened a tracking issue: [#28](https://github.com/eznix86/docker-registry-ui/issues/28).
>
> **Community input is welcome** — feel free to share your ideas or propose improvements in the issue.


## Quick Start

The UI can be deployed in minutes with Docker Compose:

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

Then open the UI at: [http://localhost:8011](http://localhost:8011)

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
  --from-literal=url="http://your-registry.com:5000" \
  --from-literal=auth="$(echo -n 'username:password' | base64)"
```

Reference the secret in your Helm values:

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
To free space, run garbage collection inside your registry container:

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
