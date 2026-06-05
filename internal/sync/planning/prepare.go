package planning

import (
	"context"
	"fmt"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/store"
)

type Logger interface {
	Info(msg string, keysAndValues ...any)
	Warn(msg string, keysAndValues ...any)
	Error(msg string, keysAndValues ...any)
	Debug(msg string, keysAndValues ...any)
}

type repoKey struct {
	host      string
	namespace string
	name      string
}

type tagKey struct {
	repoID uint
	name   string
}

func PrepareJobs(
	ctx context.Context,
	s *store.Store,
	logger Logger,
	jobs []Job,
	prog progress.ProgressReporter,
) ([]Job, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}

	prog.UpdateStep("Preparation")
	prog.UpdateMessage("Loading existing tags")

	repos, err := s.GetRepositoriesViewFiltered(ctx, store.RepositoryFilters{ShowUntagged: true})
	if err != nil {
		return nil, fmt.Errorf("get repos: %w", err)
	}

	repoMap := buildRepoMap(repos)
	allTags, err := s.GetAllTags(ctx)
	if err != nil {
		return nil, fmt.Errorf("get tags: %w", err)
	}

	tagMap := buildTagMap(allTags)
	existingCount := 0
	for i := range jobs {
		repo, ok := repoMap[newRepoKey(jobs[i].RegistryHost, jobs[i].Namespace, jobs[i].RepoName)]
		if !ok {
			continue
		}

		jobs[i].RepositoryID = repo.ID
		if tag, ok := tagMap[newTagKey(repo.ID, jobs[i].TagName)]; ok {
			jobs[i].ExistingDigest = tag.Digest
			existingCount++
		}
	}

	logger.Info("Loaded existing tags", "count", existingCount)
	prog.UpdateMessage("Filtering by schedule")

	jobsToProcess := filterBySchedule(jobs, tagMap, time.Now())
	if skipped := len(jobs) - len(jobsToProcess); skipped > 0 {
		logger.Info("Schedule filter", "skipped", skipped, "processing", len(jobsToProcess))
	}
	if len(jobsToProcess) == 0 {
		return nil, nil
	}

	prog.UpdateMessage("Sorting by priority")
	return SortByPriority(jobsToProcess), nil
}

func filterBySchedule(jobs []Job, tagMap map[tagKey]*store.Tag, now time.Time) []Job {
	filtered := make([]Job, 0, len(jobs))
	for _, job := range jobs {
		tag := tagMap[newTagKey(job.RepositoryID, job.TagName)]
		if tag == nil || tag.NextCheckAt == nil || now.After(*tag.NextCheckAt) {
			filtered = append(filtered, job)
		}
	}
	return filtered
}

func newRepoKey(host, namespace, name string) repoKey {
	return repoKey{host: host, namespace: namespace, name: name}
}

func newTagKey(repoID uint, name string) tagKey {
	return tagKey{repoID: repoID, name: name}
}

func buildRepoMap(repos []store.RepositoryView) map[repoKey]*store.RepositoryView {
	m := make(map[repoKey]*store.RepositoryView, len(repos))
	for i := range repos {
		m[newRepoKey(repos[i].RegistryHost, repos[i].Namespace, repos[i].Name)] = &repos[i]
	}
	return m
}

func buildTagMap(tags []store.Tag) map[tagKey]*store.Tag {
	m := make(map[tagKey]*store.Tag, len(tags))
	for i := range tags {
		m[newTagKey(tags[i].RepositoryID, tags[i].Name)] = &tags[i]
	}
	return m
}
