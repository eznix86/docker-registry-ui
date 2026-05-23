package sync

import (
	"context"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
)

func processTag(
	ctx context.Context,
	workerID int,
	job TagJob,
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
		return err
	}

	repoPath := job.RepoName
	if job.Namespace != "" {
		repoPath = job.Namespace + "/" + job.RepoName
	}

	label := repoPath + ":" + job.TagName
	task := prog.Track(label, "Processing")
	defer task.Done()

	digest, err := f.fetchDigest(ctx, client, repoPath, job.TagName, job.RegistryName)
	if err != nil {
		if dbErr := s.MarkTagSyncError(ctx, job.RepositoryID, job.TagName, err.Error()); dbErr != nil {
			logger.Error("Failed to record tag error", "tag", label, "dbError", dbErr)
		}
		stats.Record(TagStateError)
		return nil
	}

	if job.ExistingDigest != "" && job.ExistingDigest == digest {
		if dbErr := s.UpdateTagSyncMetadata(ctx, job.RepositoryID, job.TagName, job.PriorityScore, 30*time.Second); dbErr != nil {
			logger.Error("Failed to update tag metadata", "tag", label, "dbError", dbErr)
		}
		stats.Record(TagStateUnchanged)
		return nil
	}

	manifestResp, err := f.fetchManifest(ctx, client, repoPath, job.TagName, job.RegistryName)
	if err != nil {
		if dbErr := s.MarkTagSyncError(ctx, job.RepositoryID, job.TagName, err.Error()); dbErr != nil {
			logger.Error("Failed to record tag error", "tag", label, "dbError", dbErr)
		}
		stats.Record(TagStateError)
		return nil
	}

	graph, err := buildManifestGraph(ctx, manifestResp, client, f, repoPath, job.RegistryName, label)
	if err != nil {
		logger.Error("Failed to build manifest graph", "tag", label, "error", err)
		if dbErr := s.MarkTagSyncError(ctx, job.RepositoryID, job.TagName, err.Error()); dbErr != nil {
			logger.Error("Failed to record tag error", "tag", label, "dbError", dbErr)
		}
		stats.Record(TagStateError)
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
