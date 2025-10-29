// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/models"
	"github.com/eznix86/docker-registry-ui/internal/repository"
	"github.com/eznix86/docker-registry-ui/pkg/registry"
	"gorm.io/gorm"
)

// WorkerPool manages a pool of workers that process sync jobs
type WorkerPool struct {
	numWorkers   int
	jobRepo      *repository.SyncJobRepository
	repoRepo     *repository.RepositoryRepository
	tagRepo      *repository.TagRepository
	registryRepo *repository.RegistryRepository
	manifestRepo *repository.ManifestRepository
	cacheRepo    *repository.CacheRepository
	registryMgr  *registry.Manager
	stopCh       chan struct{}
	wg           sync.WaitGroup
}

// NewWorkerPool creates a new worker pool
func NewWorkerPool(numWorkers int, jobRepo *repository.SyncJobRepository, repoRepo *repository.RepositoryRepository, tagRepo *repository.TagRepository, registryRepo *repository.RegistryRepository, manifestRepo *repository.ManifestRepository, cacheRepo *repository.CacheRepository, registryMgr *registry.Manager) *WorkerPool {
	if numWorkers < 1 {
		numWorkers = 1
	}

	return &WorkerPool{
		numWorkers:   numWorkers,
		jobRepo:      jobRepo,
		repoRepo:     repoRepo,
		tagRepo:      tagRepo,
		registryRepo: registryRepo,
		manifestRepo: manifestRepo,
		cacheRepo:    cacheRepo,
		registryMgr:  registryMgr,
		stopCh:       make(chan struct{}),
	}
}

// Start starts the worker pool
func (wp *WorkerPool) Start(ctx context.Context) {
	log.Printf("Starting worker pool with %d workers", wp.numWorkers)

	for i := 0; i < wp.numWorkers; i++ {
		wp.wg.Add(1)
		go wp.worker(ctx, i+1)
	}

	log.Printf("Worker pool started")
}

// Stop gracefully stops the worker pool
func (wp *WorkerPool) Stop() {
	log.Printf("Stopping worker pool...")
	close(wp.stopCh)
	wp.wg.Wait()
	log.Printf("Worker pool stopped")
}

// performPostProcessing runs cache refresh and job cleanup after processing jobs
func (wp *WorkerPool) performPostProcessing(workerID int) {
	log.Printf("Worker %d: no more jobs, refreshing dirty cache...", workerID)
	if err := wp.cacheRepo.RefreshAllDirty(); err != nil {
		log.Printf("Worker %d: error refreshing cache: %v", workerID, err)
	} else {
		log.Printf("Worker %d: cache refreshed successfully", workerID)
	}

	// Clean up completed jobs older than 24 hours
	log.Printf("Worker %d: cleaning up old completed jobs...", workerID)
	if err := wp.jobRepo.DeleteCompletedJobs(24 * time.Hour); err != nil {
		log.Printf("Worker %d: error cleaning up jobs: %v", workerID, err)
	} else {
		log.Printf("Worker %d: old jobs cleaned up successfully", workerID)
	}
}

// worker is the worker goroutine that polls for jobs
func (wp *WorkerPool) worker(ctx context.Context, workerID int) {
	defer wp.wg.Done()

	log.Printf("Worker %d started", workerID)

	jobProcessed := false // Track if any job was processed in this cycle
	backoff := 1 * time.Second
	const maxBackoff = 5 * time.Second

	for {
		select {
		case <-ctx.Done():
			log.Printf("Worker %d stopping due to context cancellation", workerID)
			return
		case <-wp.stopCh:
			log.Printf("Worker %d stopping", workerID)
			return
		default:
			// Poll for next job immediately
			job, err := wp.jobRepo.DequeueJob()
			if err != nil {
				log.Printf("Worker %d: error dequeuing job: %v", workerID, err)
				// Backoff on error
				time.Sleep(backoff)
				if backoff < maxBackoff {
					backoff *= 2
				}
				continue
			}

			if job == nil {
				// No jobs available - if we processed jobs, refresh cache and cleanup old jobs
				if jobProcessed {
					wp.performPostProcessing(workerID)
					jobProcessed = false // Reset flag
				}

				// Sleep before checking again (exponential backoff when queue is empty)
				time.Sleep(backoff)
				if backoff < maxBackoff {
					backoff *= 2
				}
				continue
			}

			// Reset backoff when job found
			backoff = 1 * time.Second

			// Process the job
			log.Printf("Worker %d: processing job %d (type=%s, registry=%s)", workerID, job.ID, job.JobType, job.RegistryName)
			if err := wp.processJob(ctx, job); err != nil {
				log.Printf("Worker %d: job %d failed: %v", workerID, job.ID, err)
				if failErr := wp.jobRepo.FailJob(job.ID, err.Error()); failErr != nil {
					log.Printf("Worker %d: error marking job %d as failed: %v", workerID, job.ID, failErr)
				}
			} else {
				log.Printf("Worker %d: job %d completed successfully", workerID, job.ID)
				if completeErr := wp.jobRepo.CompleteJob(job.ID); completeErr != nil {
					log.Printf("Worker %d: error marking job %d as completed: %v", workerID, job.ID, completeErr)
				}
			}

			jobProcessed = true // Mark that we processed a job
			// Loop immediately to check for next job (no sleep)
		}
	}
}

// processJob processes a single job
func (wp *WorkerPool) processJob(ctx context.Context, job *models.SyncJob) error {
	// Get registry client
	client, err := wp.registryMgr.GetClient(job.RegistryName)
	if err != nil {
		return fmt.Errorf("failed to get registry client: %w", err)
	}

	switch job.JobType {
	case models.JobTypeSyncCatalog:
		return wp.processCatalogJob(ctx, client, job)
	case models.JobTypeSyncTags:
		return wp.processTagsJob(ctx, client, job)
	case models.JobTypeSyncManifest:
		return wp.processManifestJob(ctx, client, job)
	default:
		return fmt.Errorf("unknown job type: %s", job.JobType)
	}
}

// processCatalogJob syncs the catalog (list of repositories) using differential logic
func (wp *WorkerPool) processCatalogJob(ctx context.Context, client registry.Client, job *models.SyncJob) error {
	// Step 1: Fetch catalog from registry
	catalog, err := client.ListRepositories(ctx, nil)
	if err != nil {
		return fmt.Errorf("failed to list repositories: %w", err)
	}

	// Convert to set for efficient lookups
	registryRepos := make(map[string]bool)
	for _, repoName := range catalog.Repositories {
		registryRepos[repoName] = true
	}

	// Step 2: Get existing repos from database
	existingRepoNames, err := wp.repoRepo.FindNamesByRegistryName(job.RegistryName)
	if err != nil {
		return fmt.Errorf("failed to query existing repos: %w", err)
	}

	existingRepos := make(map[string]bool)
	for _, name := range existingRepoNames {
		existingRepos[name] = true
	}

	// Step 3: Compute differences
	var newRepos []string
	var removedRepos []string
	unchangedCount := 0

	// Find new repos (in registry but not in DB)
	for repoName := range registryRepos {
		if !existingRepos[repoName] {
			newRepos = append(newRepos, repoName)
		} else {
			unchangedCount++
		}
	}

	// Find removed repos (in DB but not in registry)
	for repoName := range existingRepos {
		if !registryRepos[repoName] {
			removedRepos = append(removedRepos, repoName)
		}
	}

	// Step 4: Log statistics
	log.Printf("Catalog sync for '%s': %d new, %d removed, %d unchanged",
		job.RegistryName, len(newRepos), len(removedRepos), unchangedCount)

	// Step 5: Delete removed repositories (CASCADE will handle tags/manifests)
	for _, repoName := range removedRepos {
		if err := wp.repoRepo.DeleteByRegistryAndName(job.RegistryName, repoName); err != nil {
			log.Printf("Catalog job: error deleting repo %s: %v", repoName, err)
			// Continue with other deletions
		} else {
			log.Printf("Catalog job: deleted repo %s (CASCADE cleanup)", repoName)
		}
	}

	// Step 6: Enqueue sync_tags jobs ONLY for new repositories
	// Unchanged repos are skipped - their tags will be synced by scheduled sync_tags jobs
	for _, repoName := range newRepos {
		tagJob := &models.SyncJob{
			JobType:      models.JobTypeSyncTags,
			RegistryName: job.RegistryName,
			RegistryURL:  job.RegistryURL,
			Repository:   &repoName,
			MaxAttempts:  3,
			Priority:     0,
		}

		created, err := wp.jobRepo.EnqueueJob(tagJob)
		if err != nil {
			log.Printf("Catalog job: error enqueueing tags job for %s: %v", repoName, err)
			continue
		}

		if created {
			log.Printf("Catalog job: enqueued tags job for new repo %s", repoName)
		}
	}

	return nil
}

// compareTagDigest checks if a tag has changed using HEAD request
func (wp *WorkerPool) compareTagDigest(ctx context.Context, client registry.Client, repo, tagName, existingDigest string) (changed bool) {
	head, err := client.HeadManifest(ctx, repo, tagName, nil)
	if err != nil {
		log.Printf("Tags job: HEAD request failed for %s:%s: %v (treating as changed)", repo, tagName, err)
		return true // Treat error as changed to trigger re-sync
	}
	return head.ContentDigest != existingDigest
}

// deleteRemovedTags deletes tags that no longer exist in the registry
func (wp *WorkerPool) deleteRemovedTags(registryName, repoName string, removedTags []string) {
	for _, tagName := range removedTags {
		if err := wp.tagRepo.DeleteByRegistryRepoAndName(registryName, repoName, tagName); err != nil {
			log.Printf("Tags job: error deleting tag %s:%s: %v", repoName, tagName, err)
			// Continue with other deletions
		} else {
			log.Printf("Tags job: deleted tag %s:%s (CASCADE cleanup)", repoName, tagName)
		}
	}
}

// enqueueManifestJobs creates sync_manifest jobs for new and changed tags
func (wp *WorkerPool) enqueueManifestJobs(job *models.SyncJob, tags []string) {
	for _, tagName := range tags {
		manifestJob := &models.SyncJob{
			JobType:      models.JobTypeSyncManifest,
			RegistryName: job.RegistryName,
			RegistryURL:  job.RegistryURL,
			Repository:   job.Repository,
			TagRef:       &tagName,
			MaxAttempts:  3,
			Priority:     0,
		}

		created, err := wp.jobRepo.EnqueueJob(manifestJob)
		if err != nil {
			log.Printf("Tags job: error enqueueing manifest job for %s:%s: %v", *job.Repository, tagName, err)
			continue
		}

		if created {
			log.Printf("Tags job: enqueued manifest job for %s:%s", *job.Repository, tagName)
		}
	}
}

// processTagsJob syncs tags for a repository using differential logic with HEAD optimization
func (wp *WorkerPool) processTagsJob(ctx context.Context, client registry.Client, job *models.SyncJob) error {
	if job.Repository == nil {
		return fmt.Errorf("repository is required for tags job")
	}

	// Step 1: Fetch tags list from registry
	tagsResp, err := client.ListTags(ctx, *job.Repository, nil)
	if err != nil {
		return fmt.Errorf("failed to list tags: %w", err)
	}

	// Convert to set for efficient lookups
	registryTags := make(map[string]bool)
	for _, tagName := range tagsResp.Tags {
		registryTags[tagName] = true
	}

	// Step 2: Get existing tags with digests from database
	existingTagDigests, err := wp.tagRepo.FindWithDigestsByRepo(job.RegistryName, *job.Repository)
	if err != nil {
		return fmt.Errorf("failed to query existing tags: %w", err)
	}

	// Step 3: Compute differences
	// Pre-allocate slices with estimated capacity to reduce reallocations
	newTags := make([]string, 0, len(registryTags))
	changedTags := make([]string, 0, len(registryTags)/4) // Estimate 25% changed
	unchangedTags := make([]string, 0, len(registryTags))
	removedTags := make([]string, 0, len(existingTagDigests)/10) // Estimate 10% removed

	// Check each registry tag
	for tagName := range registryTags {
		existingDigest, exists := existingTagDigests[tagName]
		if !exists {
			// New tag - never seen before
			newTags = append(newTags, tagName)
		} else {
			// Existing tag - use HEAD to check if digest changed
			if wp.compareTagDigest(ctx, client, *job.Repository, tagName, existingDigest) {
				// Tag digest changed - needs re-sync
				changedTags = append(changedTags, tagName)
			} else {
				// Tag unchanged - skip
				unchangedTags = append(unchangedTags, tagName)
			}
		}
	}

	// Find removed tags (in DB but not in registry)
	for tagName := range existingTagDigests {
		if !registryTags[tagName] {
			removedTags = append(removedTags, tagName)
		}
	}

	// Step 4: Log statistics
	log.Printf("Tags sync for '%s/%s': %d new, %d changed, %d unchanged, %d removed",
		job.RegistryName, *job.Repository, len(newTags), len(changedTags), len(unchangedTags), len(removedTags))

	// Step 5: Delete removed tags (CASCADE will handle tag_details)
	wp.deleteRemovedTags(job.RegistryName, *job.Repository, removedTags)

	// Step 6: Enqueue sync_manifest jobs for NEW and CHANGED tags only
	// Unchanged tags are skipped - this is the key differential optimization
	newTags = append(newTags, changedTags...)
	wp.enqueueManifestJobs(job, newTags)

	return nil
}

// processManifestJob syncs a manifest for a specific tag with multi-arch support
func (wp *WorkerPool) processManifestJob(ctx context.Context, client registry.Client, job *models.SyncJob) error {
	if job.Repository == nil {
		return fmt.Errorf("repository is required for manifest job")
	}
	if job.TagRef == nil {
		return fmt.Errorf("tag_ref is required for manifest job")
	}

	// Step 1: Fetch manifest with multi-arch accept header
	manifestResp, err := client.GetManifest(ctx, *job.Repository, *job.TagRef, &registry.ManifestOpts{
		Accept: "application/vnd.docker.distribution.manifest.v2+json," +
			"application/vnd.docker.distribution.manifest.list.v2+json," +
			"application/vnd.oci.image.manifest.v1+json," +
			"application/vnd.oci.image.index.v1+json",
	})
	if err != nil {
		return fmt.Errorf("failed to get manifest: %w", err)
	}

	// Use ContentDigest from header (canonical digest)
	manifestDigest := manifestResp.ContentDigest
	if manifestDigest == "" {
		return fmt.Errorf("manifest digest not found in response headers")
	}

	// Step 2: Detect if this is a manifest list (multi-arch)
	isManifestList := strings.Contains(manifestResp.MediaType, "manifest.list") ||
		strings.Contains(manifestResp.MediaType, "image.index")

	log.Printf("Manifest job: %s/%s:%s digest=%s multi-arch=%v",
		job.RegistryName, *job.Repository, *job.TagRef, manifestDigest, isManifestList)

	// Step 3: Get or create database records (registry, repo)
	_, dbRepo, err := wp.getOrCreateRepoReferences(job.RegistryName, job.RegistryURL, *job.Repository)
	if err != nil {
		return fmt.Errorf("failed to get/create repo references: %w", err)
	}

	if isManifestList {
		// MULTI-ARCH PATH: Process manifest list + platform manifests
		return wp.processMultiArchManifest(ctx, client, job, manifestResp, manifestDigest, dbRepo.ID)
	}

	// SINGLE-ARCH PATH: Process single manifest
	return wp.processSingleArchManifest(ctx, client, job, manifestResp, manifestDigest, dbRepo.ID)
}

// getOrCreateRepoReferences ensures registry and repository exist in DB
func (wp *WorkerPool) getOrCreateRepoReferences(registryName, registryURL, repoName string) (*models.Registry, *models.Repository, error) {
	// Get or create registry
	dbRegistry, err := wp.registryRepo.FindByName(registryName)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Strip scheme from URL to get host
			host := registryURL
			host = strings.TrimPrefix(host, "http://")
			host = strings.TrimPrefix(host, "https://")

			// Get or create registry (idempotent for concurrent workers)
			dbRegistry = &models.Registry{
				Name: registryName,
				Host: host,
			}
			if err := wp.registryRepo.DB.FirstOrCreate(dbRegistry, models.Registry{Host: host}).Error; err != nil {
				return nil, nil, fmt.Errorf("failed to get/create registry: %w", err)
			}
			log.Printf("Got/created registry: %s (id=%d)", registryName, dbRegistry.ID)
		} else {
			return nil, nil, fmt.Errorf("failed to query registry: %w", err)
		}
	}

	// Get or create repository
	dbRepo, err := wp.repoRepo.FindByRegistryAndName(dbRegistry.ID, repoName)
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create repository
			dbRepo = &models.Repository{
				RegistryID: dbRegistry.ID,
				Name:       repoName,
			}
			if err := wp.repoRepo.DB.Create(dbRepo).Error; err != nil {
				return nil, nil, fmt.Errorf("failed to create repository: %w", err)
			}
			log.Printf("Created repository: %s/%s (id=%d)", registryName, repoName, dbRepo.ID)
		} else {
			return nil, nil, fmt.Errorf("failed to query repository: %w", err)
		}
	}

	return dbRegistry, dbRepo, nil
}

// processMultiArchManifest handles manifest lists with platform-specific manifests
func (wp *WorkerPool) processMultiArchManifest(ctx context.Context, client registry.Client, job *models.SyncJob, manifestListResp *registry.ManifestResponse, manifestListDigest string, repoID uint) error {
	// Step 1: Create or update manifest list record (NO os/arch, NO parent)
	manifestListRecord := &models.Manifest{
		Digest:             manifestListDigest,
		MediaType:          manifestListResp.MediaType,
		OS:                 "", // Manifest lists have no OS
		Architecture:       "", // Manifest lists have no arch
		ManifestListDigest: "", // Manifest lists have no parent
		SizeBytes:          0,  // Will be sum of platform manifests
		Created:            "", // No creation time for lists
	}

	if err := wp.manifestRepo.DB.Save(manifestListRecord).Error; err != nil {
		return fmt.Errorf("failed to save manifest list: %w", err)
	}

	log.Printf("Saved manifest list: digest=%s", manifestListDigest)

	// Step 2: Parse platform manifests from manifest list
	var platformManifests []struct {
		MediaType string `json:"mediaType"`
		Size      int64  `json:"size"`
		Digest    string `json:"digest"`
		Platform  struct {
			Architecture string `json:"architecture"`
			OS           string `json:"os"`
		} `json:"platform"`
	}

	if manifestListResp.Raw != nil {
		if manifestsField, ok := manifestListResp.Raw["manifests"]; ok {
			manifestsJSON, _ := json.Marshal(manifestsField)
			if err := json.Unmarshal(manifestsJSON, &platformManifests); err != nil {
				return fmt.Errorf("failed to parse platform manifests: %w", err)
			}
		}
	}

	log.Printf("Found %d platform manifests in list", len(platformManifests))

	// Step 3: Process each platform manifest
	var totalSize int64
	for _, pm := range platformManifests {
		// Fetch platform manifest
		platformManifestResp, err := client.GetManifest(ctx, *job.Repository, pm.Digest, nil)
		if err != nil {
			log.Printf("Warning: failed to fetch platform manifest %s: %v", pm.Digest, err)
			continue
		}

		// Fetch config blob for creation time
		var configBlob registry.ConfigBlob
		if platformManifestResp.Config.Digest != "" {
			blobResp, err := client.GetBlob(ctx, *job.Repository, platformManifestResp.Config.Digest)
			if err != nil {
				log.Printf("Warning: failed to fetch config blob: %v", err)
			} else {
				// Config blob provides optional metadata only (creation time, labels)
				// Continue without it if parsing fails - manifest data is sufficient
				if err := json.Unmarshal(blobResp.Data, &configBlob); err != nil {
					log.Printf("Warning: failed to parse config blob (non-critical, continuing without metadata): %v", err)
				}
			}
		}

		// Calculate platform manifest size
		var layerSize int64
		for _, layer := range platformManifestResp.Layers {
			layerSize += layer.Size
		}
		totalSize += layerSize

		// Create platform manifest record (HAS os/arch, HAS parent)
		platformRecord := &models.Manifest{
			Digest:             pm.Digest,
			MediaType:          pm.MediaType,
			OS:                 pm.Platform.OS,
			Architecture:       pm.Platform.Architecture,
			ManifestListDigest: manifestListDigest, // Links to parent
			SizeBytes:          layerSize,
			Created:            configBlob.Created,
		}

		if err := wp.manifestRepo.DB.Save(platformRecord).Error; err != nil {
			log.Printf("Warning: failed to save platform manifest: %v", err)
			continue
		}

		// Save layers for this platform manifest
		if err := wp.saveLayers(pm.Digest, platformManifestResp.Layers); err != nil {
			log.Printf("Warning: failed to save layers for platform manifest: %v", err)
		}

		log.Printf("Saved platform manifest: digest=%s os=%s arch=%s size=%d",
			pm.Digest, pm.Platform.OS, pm.Platform.Architecture, layerSize)
	}

	// Step 4: Update manifest list with total size
	if err := wp.manifestRepo.DB.Model(&models.Manifest{}).
		Where("digest = ?", manifestListDigest).
		Update("size_bytes", totalSize).Error; err != nil {
		log.Printf("Warning: failed to update manifest list size: %v", err)
	}

	// Step 5: Create or update tag pointing to manifest list
	return wp.saveTag(repoID, *job.TagRef, manifestListDigest)
}

// processSingleArchManifest handles single-arch manifests
func (wp *WorkerPool) processSingleArchManifest(ctx context.Context, client registry.Client, job *models.SyncJob, manifestResp *registry.ManifestResponse, manifestDigest string, repoID uint) error {
	// Step 1: Fetch config blob for os/arch/created
	var configBlob registry.ConfigBlob
	if manifestResp.Config.Digest != "" {
		blobResp, err := client.GetBlob(ctx, *job.Repository, manifestResp.Config.Digest)
		if err != nil {
			return fmt.Errorf("failed to fetch config blob: %w", err)
		}
		if err := json.Unmarshal(blobResp.Data, &configBlob); err != nil {
			return fmt.Errorf("failed to parse config blob: %w", err)
		}
	}

	// Step 2: Calculate total size
	var totalSize int64
	for _, layer := range manifestResp.Layers {
		totalSize += layer.Size
	}

	// Step 3: Create manifest record (HAS os/arch, NO parent)
	manifestRecord := &models.Manifest{
		Digest:             manifestDigest,
		MediaType:          manifestResp.MediaType,
		OS:                 configBlob.OS,
		Architecture:       configBlob.Architecture,
		ManifestListDigest: "", // Single-arch has no parent
		SizeBytes:          totalSize,
		Created:            configBlob.Created,
	}

	if err := wp.manifestRepo.DB.Save(manifestRecord).Error; err != nil {
		return fmt.Errorf("failed to save manifest: %w", err)
	}

	log.Printf("Saved single-arch manifest: digest=%s os=%s arch=%s size=%d",
		manifestDigest, configBlob.OS, configBlob.Architecture, totalSize)

	// Step 4: Save layers
	if err := wp.saveLayers(manifestDigest, manifestResp.Layers); err != nil {
		return fmt.Errorf("failed to save layers: %w", err)
	}

	// Step 5: Create or update tag pointing to manifest
	return wp.saveTag(repoID, *job.TagRef, manifestDigest)
}

// saveLayers saves manifest layers to database
func (wp *WorkerPool) saveLayers(manifestDigest string, layers []registry.ManifestLayer) error {
	// Delete existing layers (idempotent update)
	if err := wp.manifestRepo.DB.Where("manifest_digest = ?", manifestDigest).Delete(&models.ManifestLayer{}).Error; err != nil {
		return fmt.Errorf("failed to delete existing layers: %w", err)
	}

	// Insert new layers
	for _, layer := range layers {
		layerRecord := &models.ManifestLayer{
			ManifestDigest: manifestDigest,
			LayerDigest:    layer.Digest,
			SizeBytes:      layer.Size,
		}
		if err := wp.manifestRepo.DB.Create(layerRecord).Error; err != nil {
			return fmt.Errorf("failed to create layer: %w", err)
		}
	}

	return nil
}

// saveTag creates or updates a tag pointing to a manifest
func (wp *WorkerPool) saveTag(repoID uint, tagName, digest string) error {
	// Use UPSERT to handle tag updates (tag name might now point to different digest)
	tag := &models.Tag{
		RepoID: repoID,
		Name:   tagName,
		Digest: digest,
	}

	// Try to find existing tag
	var existingTag models.Tag
	err := wp.tagRepo.DB.Where("repo_id = ? AND name = ?", repoID, tagName).First(&existingTag).Error
	switch err {
	case nil:
		// Tag exists - update digest if changed
		if existingTag.Digest != digest {
			existingTag.Digest = digest
			if err := wp.tagRepo.DB.Save(&existingTag).Error; err != nil {
				return fmt.Errorf("failed to update tag: %w", err)
			}
			log.Printf("Updated tag: repo_id=%d name=%s digest=%s", repoID, tagName, digest)
		}
	case gorm.ErrRecordNotFound:
		// Tag doesn't exist - create it
		if err := wp.tagRepo.DB.Create(tag).Error; err != nil {
			return fmt.Errorf("failed to create tag: %w", err)
		}
		log.Printf("Created tag: repo_id=%d name=%s digest=%s", repoID, tagName, digest)
	default:
		return fmt.Errorf("failed to query tag: %w", err)
	}

	return nil
}
