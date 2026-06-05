package planning

import "sync"

type Scheduler struct {
	mu     sync.Mutex
	order  []string
	queues map[string][]Job
	next   int
	total  int
}

func NewScheduler(jobs []Job) *Scheduler {
	s := &Scheduler{
		order:  make([]string, 0),
		queues: make(map[string][]Job),
		total:  len(jobs),
	}
	for _, job := range jobs {
		if _, ok := s.queues[job.RegistryName]; !ok {
			s.order = append(s.order, job.RegistryName)
		}
		s.queues[job.RegistryName] = append(s.queues[job.RegistryName], job)
	}
	return s
}

func (s *Scheduler) Next() (Job, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.total == 0 || len(s.order) == 0 {
		return Job{}, false
	}
	for i := range len(s.order) {
		idx := (s.next + i) % len(s.order)
		queue := s.queues[s.order[idx]]
		if len(queue) == 0 {
			continue
		}
		job := queue[0]
		s.queues[s.order[idx]] = queue[1:]
		s.next = (idx + 1) % len(s.order)
		s.total--
		return job, true
	}
	return Job{}, false
}
