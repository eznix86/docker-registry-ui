package sync

import (
	"context"
	"sync"
	"sync/atomic"

	clog "github.com/charmbracelet/log"
	"golang.org/x/sync/semaphore"
)

type limiter struct {
	semaphores  map[string]*limiterEntry
	circuitOpen map[string]bool
	failures    map[string]int
	threshold   int
	maxPerReg   int64
	mu          sync.RWMutex
}

type limiterEntry struct {
	sem  *semaphore.Weighted
	refs atomic.Int32
}

func newLimiter(maxPerReg, threshold int) *limiter {
	return &limiter{
		semaphores:  make(map[string]*limiterEntry),
		circuitOpen: make(map[string]bool),
		failures:    make(map[string]int),
		threshold:   threshold,
		maxPerReg:   int64(maxPerReg),
	}
}

func (l *limiter) acquire(ctx context.Context, registry string) (release func(), err error) {
	l.mu.Lock()
	entry, exists := l.semaphores[registry]
	if !exists {
		entry = &limiterEntry{sem: semaphore.NewWeighted(l.maxPerReg)}
		l.semaphores[registry] = entry
	}
	entry.refs.Add(1)
	l.mu.Unlock()

	if err := entry.sem.Acquire(ctx, 1); err != nil {
		entry.refs.Add(-1)
		return nil, err
	}
	return func() { l.release(registry) }, nil
}

func (l *limiter) release(registry string) {
	l.mu.RLock()
	entry, ok := l.semaphores[registry]
	l.mu.RUnlock()
	if !ok {
		return
	}
	entry.sem.Release(1)
	entry.refs.Add(-1)
}

func (l *limiter) markFailure(registry string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.failures[registry]++
	if l.failures[registry] >= l.threshold && !l.circuitOpen[registry] {
		l.circuitOpen[registry] = true
		clog.Warn("Circuit breaker opened", "registry", registry, "failures", l.failures[registry])
	}
}

func (l *limiter) resetFailures(registry string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.failures[registry] = 0
}

func (l *limiter) getCircuitStatus() map[string]bool {
	l.mu.RLock()
	defer l.mu.RUnlock()
	result := make(map[string]bool)
	for reg, open := range l.circuitOpen {
		if open {
			result[reg] = true
		}
	}
	return result
}
