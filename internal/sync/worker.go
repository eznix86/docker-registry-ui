package sync

import (
	"context"
	"fmt"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/eznix86/docker-registry-ui/internal/sync/planning"
)

const unchangedTagRecheckInterval = 30 * time.Second

func processTag(
	ctx context.Context,
	job planning.Job,
	stats *SyncStats,
	f *fetcher,
	p *persister,
	s *store.Store,
	rm *registry.Manager,
	prog progress.ProgressReporter,
	logger Logger,
) error {
	client, err := rm.GetClient(job.RegistryName)
	if err != nil {
		stats.Record(TagStateError)
		return fmt.Errorf("get client %s: %w", job.RegistryName, err)
	}

	repoPath := job.RepoPath()
	label := repoPath + ":" + job.TagName
	task := prog.Track(label, "Processing")
	defer task.Done()

	digest, err := f.fetchDigest(ctx, client, repoPath, job.TagName, job.RegistryName)
	if err != nil {
		handleTagSyncError(ctx, s, stats, logger, job, label, err)
		return nil
	}

	if job.ExistingDigest != "" && job.ExistingDigest == digest {
		if dbErr := s.UpdateTagSyncMetadata(ctx, job.RepositoryID, job.TagName, job.PriorityScore, unchangedTagRecheckInterval); dbErr != nil {
			logger.Error("Failed to update tag metadata", "tag", label, "dbError", dbErr)
		}
		stats.Record(TagStateUnchanged)
		return nil
	}

	manifestResp, err := f.fetchManifest(ctx, client, repoPath, job.TagName, job.RegistryName)
	if err != nil {
		handleTagSyncError(ctx, s, stats, logger, job, label, err)
		return nil
	}

	graph, err := buildManifestGraph(ctx, manifestResp, client, f, repoPath, job.RegistryName, label)
	if err != nil {
		logger.Error("Failed to build manifest graph", "tag", label, "error", err)
		handleTagSyncError(ctx, s, stats, logger, job, label, err)
		return nil
	}

	if err := p.save(ctx, job, digest, graph); err != nil {
		logger.Error("Persist failed", "tag", label, "error", err)
		stats.Record(TagStateError)
		return nil
	}

	if job.ExistingDigest == "" {
		stats.Record(TagStateNew)
	} else {
		stats.Record(TagStateChanged)
	}
	return nil
}

func handleTagSyncError(
	ctx context.Context,
	s *store.Store,
	stats *SyncStats,
	logger Logger,
	job planning.Job,
	label string,
	err error,
) {
	if dbErr := s.MarkTagSyncError(ctx, job.RepositoryID, job.TagName, err.Error()); dbErr != nil {
		logger.Error("Failed to record tag error", "tag", label, "dbError", dbErr)
	}

	stats.Record(TagStateError)
}
