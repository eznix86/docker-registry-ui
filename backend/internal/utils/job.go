// Package job provides a simple job dispatcher / worker pool.
//
// It runs indefinitely until you call Stop(), and you can dispatch jobs
// (functions) to be executed concurrently.
package utils

import (
	"context"
)

// Dispatcher manages a pool of worker goroutines that execute jobs.
type Dispatcher struct {
	queue   chan func()
	workers int
	ctx     context.Context
	cancel  context.CancelFunc
}

// New creates a Dispatcher with a given number of workers and queue size.
func New(workers int, queueSize int) *Dispatcher {
	ctx, cancel := context.WithCancel(context.Background())
	d := &Dispatcher{
		queue:   make(chan func(), queueSize),
		workers: workers,
		ctx:     ctx,
		cancel:  cancel,
	}
	d.start()
	return d
}

// start launches worker goroutines that run jobs from the queue.
func (d *Dispatcher) start() {
	for i := 0; i < d.workers; i++ {
		go func(id int) {
			for {
				select {
				case <-d.ctx.Done():
					return
				case job := <-d.queue:
					if job != nil {
						job()
					}
				}
			}
		}(i)
	}
}

// Dispatch submits a job (function) to be executed.
func (d *Dispatcher) Dispatch(job func()) {
	select {
	case d.queue <- job:
	case <-d.ctx.Done():
		// dispatcher stopped
	}
}

// Stop gracefully shuts down the dispatcher.
func (d *Dispatcher) Stop() {
	d.cancel()
}
