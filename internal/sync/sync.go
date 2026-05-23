package sync

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"time"

	clog "github.com/charmbracelet/log"
	"github.com/eznix86/docker-registry-ui/internal/progress"
	"github.com/eznix86/docker-registry-ui/internal/registry"
	"github.com/eznix86/docker-registry-ui/internal/store"
)

// Config holds sync engine configuration values.
type Config struct {
	Workers                 int
	MaxPerRegistry          int
	Debug                   bool
	SyncInterval            time.Duration
	CircuitBreakerThreshold int
}

// Deps provides dependencies for creating a new sync Service.
type Deps struct {
	Store           *store.Store
	RegistryManager *registry.Manager
	Progress        progress.ProgressReporter
	Config          Config
}

// Service manages background and manual sync lifecycle.
type Service struct {
	engine   *engine
	interval time.Duration
	stopCh   chan struct{}
	manualCh ManualSyncChannel
	running  sync.Mutex
	stopOnce sync.Once
	wg       sync.WaitGroup
}

// ManualSyncChannel is a buffered channel for triggering manual syncs.
type ManualSyncChannel chan struct{}

// ErrNoRegistries indicates no registries are configured.
var ErrNoRegistries = errors.New("no registries configured")

// TagJobInput holds the user-visible fields needed to identify a tag to sync.
type TagJobInput struct {
	RegistryName string
	Namespace    string
	RepoName     string
	TagName      string
}

// TagJob describes a single tag sync job with internal state.
type TagJob struct {
	TagJobInput
	RegistryID     uint
	RegistryHost   string
	RepositoryID   uint
	PriorityScore  float64
	ExistingDigest string
}

// ManifestKind is the kind of manifest.
type ManifestKind string

const (
	// KindImage identifies a single-platform image manifest.
	KindImage ManifestKind = "image"
	// KindIndex identifies a multi-arch manifest list/index.
	KindIndex ManifestKind = "index"
	// KindHelm identifies a Helm chart OCI artifact.
	KindHelm ManifestKind = "helm"
)

// TagState tracks the outcome of a tag sync operation.
type TagState int

const (
	TagStateNew TagState = iota
	TagStateChanged
	TagStateUnchanged
	TagStateError
	TagStateSkipped
)

// SyncStats holds thread-safe counters for sync outcomes.
type SyncStats struct {
	TotalTags     int
	NewTags       int
	ChangedTags   int
	UnchangedTags int
	ErrorTags     int
	SkippedTags   int
	mu            sync.Mutex
}

// Record records a tag sync outcome.
func (s *SyncStats) Record(state TagState) {
	s.mu.Lock()
	defer s.mu.Unlock()
	switch state {
	case TagStateNew:
		s.NewTags++
	case TagStateChanged:
		s.ChangedTags++
	case TagStateUnchanged:
		s.UnchangedTags++
	case TagStateError:
		s.ErrorTags++
	case TagStateSkipped:
		s.SkippedTags++
	}
}

// GetProgress returns the current processed and total counts.
func (s *SyncStats) GetProgress() (processed, total int) {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.NewTags + s.ChangedTags + s.UnchangedTags + s.ErrorTags, s.TotalTags
}

// Result holds the final sync result.
type Result struct {
	TotalTags     int
	NewTags       int
	ChangedTags   int
	UnchangedTags int
	ErrorTags     int
	SkippedTags   int
	Duration      time.Duration
}

// Logger is the logging interface used by the sync engine.
type Logger interface {
	Info(msg string, keysAndValues ...any)
	Warn(msg string, keysAndValues ...any)
	Error(msg string, keysAndValues ...any)
	Debug(msg string, keysAndValues ...any)
}

type defaultLogger struct{}

// NewDefaultLogger creates a default logger using charmbracelet/log.
func NewDefaultLogger() Logger { return &defaultLogger{} }

func (l *defaultLogger) Info(msg string, args ...any)  { clog.Info(msg, args...) }
func (l *defaultLogger) Warn(msg string, args ...any)  { clog.Warn(msg, args...) }
func (l *defaultLogger) Error(msg string, args ...any) { clog.Error(msg, args...) }
func (l *defaultLogger) Debug(msg string, args ...any) { clog.Debug(msg, args...) }

type engine struct {
	store     *store.Store
	manager   *registry.Manager
	logger    Logger
	workers   int
	maxPerReg int
	cbThresh  int
	progress  progress.ProgressReporter
	startTime time.Time
}

// New creates a new sync Service from the given dependencies.
func New(deps Deps) (*Service, error) {
	maxPerReg := deps.Config.MaxPerRegistry
	if maxPerReg == 0 {
		maxPerReg = max(deps.Config.Workers, 1)
	}
	eng := &engine{
		store:     deps.Store,
		manager:   deps.RegistryManager,
		logger:    NewDefaultLogger(),
		workers:   deps.Config.Workers,
		maxPerReg: maxPerReg,
		cbThresh:  deps.Config.CircuitBreakerThreshold,
		progress:  deps.Progress,
	}
	return &Service{
		engine:   eng,
		interval: deps.Config.SyncInterval,
		stopCh:   make(chan struct{}),
		manualCh: make(ManualSyncChannel, 1),
	}, nil
}

// ManualSyncChan returns the channel used for triggering manual syncs.
func (s *Service) ManualSyncChan() ManualSyncChannel { return s.manualCh }

// Run performs a one-shot sync.
func (s *Service) Run(ctx context.Context) (*Result, error) {
	result, err := s.engine.SyncAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("sync failed: %w", err)
	}
	return result, nil
}

// StartBackground starts the sync service in background mode.
func (s *Service) StartBackground(ctx context.Context) {
	clog.Info("Starting background sync", "interval", s.interval)
	s.runAsync(ctx, "initial")

	var tickerCh <-chan time.Time
	if s.interval > 0 {
		ticker := time.NewTicker(s.interval)
		defer ticker.Stop()
		tickerCh = ticker.C
	}

	for {
		select {
		case <-tickerCh:
			s.runAsync(ctx, "scheduled")
		case <-s.manualCh:
			s.runAsync(ctx, "manual")
		case <-ctx.Done():
			return
		case <-s.stopCh:
			return
		}
	}
}

// Stop gracefully stops the background sync service.
func (s *Service) Stop() {
	s.stopOnce.Do(func() { close(s.stopCh) })
	s.wg.Wait()
}

func (s *Service) runAsync(ctx context.Context, reason string) {
	if !s.running.TryLock() {
		clog.Warn("Sync skipped, previous run still active", "reason", reason)
		return
	}
	s.wg.Add(1)
	go func() {
		defer s.wg.Done()
		defer s.running.Unlock()
		result, err := s.Run(ctx)
		if err != nil {
			clog.Error("Sync failed", "reason", reason, "error", err)
			return
		}
		ShowResult(result)
	}()
}

// TriggerManualSync sends a non-blocking trigger on the manual sync channel.
func TriggerManualSync(ch ManualSyncChannel) bool {
	if ch == nil {
		return false
	}
	select {
	case ch <- struct{}{}:
		return true
	default:
		return false
	}
}

// SyncAll runs the full synchronization pipeline.
func (e *engine) SyncAll(ctx context.Context) (*Result, error) {
	e.startTime = time.Now()
	e.progress.Reset()
	defer e.progress.Complete()

	if err := e.syncRegistries(ctx); err != nil {
		return nil, fmt.Errorf("sync registries: %w", err)
	}

	registries, err := e.loadRegistries(ctx)
	if err != nil {
		return nil, fmt.Errorf("load registries: %w", err)
	}
	if len(registries) == 0 {
		return nil, ErrNoRegistries
	}

	report, err := e.discoverAll(ctx, registries)
	if err != nil {
		return nil, err
	}

	if err := e.upsertDiscoveredRepos(ctx, report, registries); err != nil {
		return nil, err
	}
	if err := e.pruneStaleRepos(ctx, report); err != nil {
		return nil, err
	}
	if err := e.pruneStaleTags(ctx, report); err != nil {
		return nil, err
	}

	jobs, err := e.prepareJobs(ctx, report)
	if err != nil {
		return nil, err
	}
	if len(jobs) == 0 {
		if err := e.store.CleanupOrphans(ctx); err != nil {
			e.logger.Error("Cleanup orphans failed", "error", err)
		}
		return e.buildResult(nil), nil
	}

	stats := e.processTags(ctx, jobs)
	e.progress.UpdateStep("Cleanup")
	if err := e.store.CleanupOrphans(ctx); err != nil {
		e.logger.Error("Cleanup orphans failed", "error", err)
	}

	return e.buildResult(stats), nil
}

func (e *engine) buildResult(stats *SyncStats) *Result {
	if stats == nil {
		return &Result{Duration: time.Since(e.startTime)}
	}
	return &Result{
		TotalTags:     stats.TotalTags,
		NewTags:       stats.NewTags,
		ChangedTags:   stats.ChangedTags,
		UnchangedTags: stats.UnchangedTags,
		ErrorTags:     stats.ErrorTags,
		SkippedTags:   stats.SkippedTags,
		Duration:      time.Since(e.startTime),
	}
}

func (e *engine) processTags(ctx context.Context, jobs []TagJob) *SyncStats {
	e.progress.UpdateStep("Syncing")
	e.progress.UpdateMessage("Processing tags")
	e.progress.SetTotal(len(jobs))

	scheduler := newRegistryScheduler(jobs)
	lim := newLimiter(e.maxPerReg, e.cbThresh)
	stats := &SyncStats{TotalTags: len(jobs)}
	f := newFetcher(lim)
	pers := newPersister(e.store)

	var wg sync.WaitGroup
	for i := range e.workers {
		wg.Add(1)
		go e.runWorker(ctx, &wg, i, stats, f, pers, scheduler)
	}
	wg.Wait()
	return stats
}

func (e *engine) runWorker(
	ctx context.Context, wg *sync.WaitGroup, workerID int,
	stats *SyncStats, f *fetcher, p *persister, scheduler *registryScheduler,
) {
	defer wg.Done()
	for {
		select {
		case <-ctx.Done():
			return
		default:
		}
		job, ok := scheduler.Next()
		if !ok {
			return
		}
		if err := processTag(ctx, workerID, job, stats, f, p, e.store, e.manager, e.progress, e.logger); err != nil {
			e.logger.Error("Tag error", "worker", workerID, "tag", job.TagName, "error", err)
		}
	}
}

// ShowResult logs the sync result summary.
func ShowResult(r *Result) {
	var throughput float64
	if r.Duration.Seconds() > 0 {
		throughput = float64(r.TotalTags) / r.Duration.Seconds()
	}
	clog.Info("Sync Summary",
		"total", r.TotalTags, "new", r.NewTags, "changed", r.ChangedTags,
		"unchanged", r.UnchangedTags, "errors", r.ErrorTags,
		"skipped", r.SkippedTags, "duration", r.Duration,
		"throughput", fmt.Sprintf("%.1f tags/sec", throughput))
}

// Phase methods.

func (e *engine) syncRegistries(ctx context.Context) error {
	names := e.manager.ListRegistries()
	for _, name := range names {
		client, err := e.manager.GetClient(name)
		if err != nil {
			return fmt.Errorf("get client %s: %w", name, err)
		}
		if _, err := e.store.UpsertRegistryByFields(ctx, name, "https://"+client.Host(), client.Host(), 0); err != nil {
			return fmt.Errorf("upsert registry %s: %w", name, err)
		}
	}

	existing, err := e.store.GetAllRegistries(ctx)
	if err != nil {
		return fmt.Errorf("get registries: %w", err)
	}

	configHosts := make(map[string]bool)
	for _, name := range names {
		client, _ := e.manager.GetClient(name)
		if client != nil {
			configHosts[client.Host()] = true
		}
	}
	for _, reg := range existing {
		if !configHosts[reg.Host] {
			if err := e.store.DeleteRegistry(ctx, reg.ID); err != nil {
				e.logger.Warn("Failed to delete stale registry", "host", reg.Host, "error", err)
			}
		}
	}

	return nil
}

func (e *engine) loadRegistries(ctx context.Context) ([]store.Registry, error) {
	return e.store.GetAllRegistries(ctx)
}

func (e *engine) discoverAll(ctx context.Context, registries []store.Registry) (*discoveryReport, error) {
	return discoverAll(ctx, e.store, e.manager, registries, e.progress, e.logger)
}

func (e *engine) upsertDiscoveredRepos(ctx context.Context, report *discoveryReport, registries []store.Registry) error {
	return upsertDiscoveredRepos(ctx, e.store, e.logger, report.Repos, registries)
}

func (e *engine) pruneStaleRepos(ctx context.Context, report *discoveryReport) error {
	return pruneStaleRepos(ctx, e.store, e.logger, report.Registries, report.Repos)
}

func (e *engine) pruneStaleTags(ctx context.Context, report *discoveryReport) error {
	return pruneStaleTags(ctx, e.store, e.logger, report.Repos)
}

func (e *engine) prepareJobs(ctx context.Context, report *discoveryReport) ([]TagJob, error) {
	_, jobs, err := prepareJobs(ctx, e.store, e.logger, report.Jobs, e.progress)
	return jobs, err
}
