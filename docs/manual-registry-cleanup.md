# Manual Registry Cleanup

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
