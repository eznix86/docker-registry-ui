package sync

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
	registryclient "github.com/eznix86/registry-client"
)

// discoveryReport bundles all results from the discovery phase.
type discoveryReport struct {
	Jobs       []TagJob
	Repos      []DiscoveredRepository
	Registries []DiscoveredRegistry
	Errors     map[string]error
}

func discoverAll(
	ctx context.Context,
	s *store.Store,
	rm *registry.Manager,
	registries []store.Registry,
	prog progress.ProgressReporter,
	logger Logger,
) (*discoveryReport, error) {
	prog.UpdateStep("Discovery")
	prog.UpdateMessage("Scanning registries")

	resultCh := make(chan discoveryResult, len(registries))
	for _, reg := range registries {
		go func(r store.Registry) {
			repos, status, err := discoverOneRegistry(ctx, rm, r, logger)
			resultCh <- discoveryResult{
				regName: r.Name,
				regHost: r.Host,
				repos:   repos,
				status:  status,
				err:     err,
			}
		}(reg)
	}

	report := &discoveryReport{
		Errors: make(map[string]error),
	}
	var errCount int

	for range registries {
		r := <-resultCh

		if dbErr := s.UpdateRegistryStatus(ctx, r.regHost, strconv.Itoa(r.status)); dbErr != nil {
			logger.Warn("Failed to update registry status", "registry", r.regName, "error", dbErr)
		}

		if r.err != nil {
			logger.Error("Discovery error", "registry", r.regName, "error", r.err)
			report.Errors[r.regName] = r.err
			errCount++
			continue
		}

		tagCount := 0
		for _, repo := range r.repos {
			tagCount += len(repo.Tags)
		}
		logger.Info("Discovered", "registry", r.regName, "repositories", len(r.repos), "tags", tagCount)
		report.Registries = append(report.Registries, DiscoveredRegistry{Name: r.regName, Host: r.regHost})

		jobs, repos := processDiscovered(r)
		report.Jobs = append(report.Jobs, jobs...)
		report.Repos = append(report.Repos, repos...)
	}

	if errCount > 0 && len(report.Jobs) == 0 {
		return nil, fmt.Errorf("all %d registries failed discovery", errCount)
	}
	return report, nil
}

type discoveryResult struct {
	regName string
	regHost string
	repos   []DiscoveredRepo
	status  int
	err     error
}

func discoverOneRegistry(
	ctx context.Context,
	rm *registry.Manager,
	reg store.Registry,
	logger Logger,
) ([]DiscoveredRepo, int, error) {
	client, err := rm.GetClient(reg.Name)
	if err != nil {
		return nil, 0, fmt.Errorf("get client %s: %w", reg.Name, err)
	}
	status, err := client.HealthCheck(ctx)
	if err != nil {
		return nil, status, fmt.Errorf("health check %s: %w", reg.Name, err)
	}

	var repositories []string
	last := ""
	for {
		resp, err := client.GetCatalog(ctx, &registryclient.PaginationParams{N: 100, Last: last})
		if err != nil {
			return nil, status, fmt.Errorf("catalog %s: %w", reg.Name, err)
		}
		repositories = append(repositories, resp.Repositories...)
		if len(resp.Repositories) < 100 {
			break
		}
		last = resp.Repositories[len(resp.Repositories)-1]
		select {
		case <-ctx.Done():
			return nil, status, ctx.Err()
		default:
		}
	}

	var discovered []DiscoveredRepo
	for _, repoFull := range repositories {
		ns, name := splitRepoName(repoFull)

		var tags []string
		tagsFetched := true
		lastTag := ""
	fetchTags:
		for {
			resp, err := client.ListTags(ctx, repoFull, &registryclient.PaginationParams{N: 100, Last: lastTag})
			if err != nil {
				logger.Warn("Failed to list tags", "registry", reg.Name, "repo", repoFull, "error", err)
				tagsFetched = false
				break
			}
			tags = append(tags, resp.Tags...)
			if len(resp.Tags) < 100 {
				break
			}
			lastTag = resp.Tags[len(resp.Tags)-1]
			select {
			case <-ctx.Done():
				tagsFetched = false
				break fetchTags
			default:
			}
		}

		discovered = append(discovered, DiscoveredRepo{
			Namespace:   ns,
			Name:        name,
			Tags:        tags,
			TagsFetched: tagsFetched,
		})
	}

	return discovered, status, nil
}

func processDiscovered(r discoveryResult) ([]TagJob, []DiscoveredRepository) {
	var jobs []TagJob
	var repos []DiscoveredRepository
	for _, repo := range r.repos {
		repos = append(repos, DiscoveredRepository{
			RegistryName: r.regName,
			RegistryHost: r.regHost,
			Namespace:    repo.Namespace,
			Name:         repo.Name,
			Tags:         repo.Tags,
			TagsFetched:  repo.TagsFetched,
		})
		for _, tag := range repo.Tags {
			jobs = append(jobs, TagJob{
				TagJobInput: TagJobInput{
					RegistryName: r.regName,
					Namespace:    repo.Namespace,
					RepoName:     repo.Name,
					TagName:      tag,
				},
				RegistryHost:  r.regHost,
				PriorityScore: CalculatePriorityScore(tag),
			})
		}
	}
	return jobs, repos
}

func upsertDiscoveredRepos(
	ctx context.Context,
	s *store.Store,
	logger Logger,
	repos []DiscoveredRepository,
	registries []store.Registry,
) error {
	regMap := make(map[string]uint)
	for _, r := range registries {
		regMap[r.Name] = r.ID
	}
	count := 0
	for _, repo := range repos {
		regID, ok := regMap[repo.RegistryName]
		if !ok {
			logger.Warn("Registry not found for repo", "registry", repo.RegistryName, "repo", repo.Name)
			continue
		}
		if _, err := s.UpsertRepositoryByFields(ctx, regID, repo.Namespace, repo.Name); err != nil {
			return fmt.Errorf("upsert repo %s/%s: %w", repo.Namespace, repo.Name, err)
		}
		count++
	}
	logger.Info("Repositories upserted", "count", count)
	return nil
}

func pruneStaleRepos(
	ctx context.Context,
	s *store.Store,
	logger Logger,
	discoveredRegs []DiscoveredRegistry,
	discoveredRepos []DiscoveredRepository,
) error {
	if len(discoveredRegs) == 0 {
		return nil
	}
	allRepos, err := s.GetRepositoriesViewFiltered(ctx, store.RepositoryFilters{ShowUntagged: true})
	if err != nil {
		return fmt.Errorf("get repos for pruning: %w", err)
	}
	validHosts := make(map[string]bool)
	for _, dr := range discoveredRegs {
		validHosts[dr.Host] = true
	}
	validRepos := make(map[string]bool)
	for _, repo := range discoveredRepos {
		validRepos[makeRepoKey(repo.RegistryHost, repo.Namespace, repo.Name)] = true
	}
	deleted := 0
	for _, repo := range allRepos {
		if !validHosts[repo.RegistryHost] {
			continue
		}
		key := makeRepoKey(repo.RegistryHost, repo.Namespace, repo.Name)
		if validRepos[key] {
			continue
		}
		if err := s.DeleteRepository(ctx, &store.Repository{ID: repo.ID}); err != nil {
			return fmt.Errorf("delete stale repo %s/%s: %w", repo.Namespace, repo.Name, err)
		}
		deleted++
	}
	if deleted > 0 {
		logger.Info("Stale repositories pruned", "deleted", deleted)
	}
	return nil
}

// pruneStaleTags removes tags from the database that are no longer present in the
// discovered tag list. Only prunes tags from registries/repos where the full tag
// list was successfully fetched (TagsFetched == true). If discovery failed for a
// registry, its tags are left untouched to avoid accidental data loss.
func pruneStaleTags(
	ctx context.Context,
	s *store.Store,
	logger Logger,
	discoveredRepos []DiscoveredRepository,
) error {
	repos, err := s.GetRepositoriesViewFiltered(ctx, store.RepositoryFilters{ShowUntagged: true})
	if err != nil {
		return fmt.Errorf("get repos for tag pruning: %w", err)
	}
	tags, err := s.GetAllTags(ctx)
	if err != nil {
		return fmt.Errorf("get tags for pruning: %w", err)
	}
	repoMap := buildRepoMap(repos)
	tagsByRepo := groupTagsByRepo(tags)
	deleted := 0
	skipped := 0
	for _, dr := range discoveredRepos {
		if !dr.TagsFetched {
			skipped++
			continue
		}
		key := makeRepoKey(dr.RegistryHost, dr.Namespace, dr.Name)
		repo, ok := repoMap[key]
		if !ok {
			continue
		}
		current := makeSet(dr.Tags)
		for _, tag := range tagsByRepo[repo.ID] {
			if current[tag.Name] {
				continue
			}
			if err := s.DeleteTag(ctx, &store.Tag{ID: tag.ID}); err != nil {
				return fmt.Errorf("delete stale tag %s: %w", tag.Name, err)
			}
			deleted++
		}
	}
	if deleted > 0 || skipped > 0 {
		logger.Info("Stale tags pruned", "deleted", deleted, "skipped_repos", skipped)
	}
	return nil
}

func prepareJobs(
	ctx context.Context,
	s *store.Store,
	logger Logger,
	jobs []TagJob,
	prog progress.ProgressReporter,
) (map[string]*store.Tag, []TagJob, error) {
	select {
	case <-ctx.Done():
		return nil, nil, ctx.Err()
	default:
	}
	prog.UpdateStep("Preparation")
	prog.UpdateMessage("Loading existing tags")
	repos, err := s.GetRepositoriesViewFiltered(ctx, store.RepositoryFilters{ShowUntagged: true})
	if err != nil {
		return nil, nil, fmt.Errorf("get repos: %w", err)
	}
	repoMap := buildRepoMap(repos)
	allTags, err := s.GetAllTags(ctx)
	if err != nil {
		return nil, nil, fmt.Errorf("get tags: %w", err)
	}
	tagMap := buildTagMap(allTags)
	existingCount := 0
	for i := range jobs {
		key := makeRepoKey(jobs[i].RegistryHost, jobs[i].Namespace, jobs[i].RepoName)
		repo, ok := repoMap[key]
		if !ok {
			continue
		}
		jobs[i].RepositoryID = repo.ID
		if tag, ok := tagMap[makeTagKey(repo.ID, jobs[i].TagName)]; ok {
			jobs[i].ExistingDigest = tag.Digest
			existingCount++
		}
	}
	logger.Info("Loaded existing tags", "count", existingCount)
	prog.UpdateMessage("Filtering by schedule")
	now := time.Now()
	jobsToProcess := filterBySchedule(jobs, tagMap, now)
	if skipped := len(jobs) - len(jobsToProcess); skipped > 0 {
		logger.Info("Schedule filter", "skipped", skipped, "processing", len(jobsToProcess))
	}
	if len(jobsToProcess) == 0 {
		return tagMap, nil, nil
	}
	prog.UpdateMessage("Sorting by priority")
	jobsToProcess = sortByPriority(jobsToProcess)
	return tagMap, jobsToProcess, nil
}

// DiscoveredRepository represents a repository found during discovery.
type DiscoveredRepository struct {
	RegistryName string
	RegistryHost string
	Namespace    string
	Name         string
	Tags         []string
	TagsFetched  bool
}

// DiscoveredRegistry represents a registry found during discovery.
type DiscoveredRegistry struct{ Name, Host string }

// DiscoveredRepo holds repository-level discovery data from a single registry.
type DiscoveredRepo struct {
	Namespace   string
	Name        string
	Tags        []string
	TagsFetched bool
}

func makeRepoKey(host, ns, name string) string {
	return fmt.Sprintf("%s|%s|%s", host, ns, name)
}

func makeTagKey(repoID uint, name string) string {
	return fmt.Sprintf("%d|%s", repoID, name)
}

func splitRepoName(full string) (ns, name string) {
	parts := strings.SplitN(full, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return "", parts[0]
}

func buildRepoMap(repos []store.RepositoryView) map[string]*store.RepositoryView {
	m := make(map[string]*store.RepositoryView, len(repos))
	for i := range repos {
		m[makeRepoKey(repos[i].RegistryHost, repos[i].Namespace, repos[i].Name)] = &repos[i]
	}
	return m
}

func buildTagMap(tags []store.Tag) map[string]*store.Tag {
	m := make(map[string]*store.Tag, len(tags))
	for i := range tags {
		m[makeTagKey(tags[i].RepositoryID, tags[i].Name)] = &tags[i]
	}
	return m
}

func groupTagsByRepo(tags []store.Tag) map[uint][]store.Tag {
	m := make(map[uint][]store.Tag)
	for _, t := range tags {
		m[t.RepositoryID] = append(m[t.RepositoryID], t)
	}
	return m
}

func makeSet(items []string) map[string]bool {
	s := make(map[string]bool, len(items))
	for _, item := range items {
		s[item] = true
	}
	return s
}
