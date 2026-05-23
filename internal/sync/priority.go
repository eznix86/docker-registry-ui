package sync

import (
	"cmp"
	"regexp"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/store"
	"github.com/hashicorp/go-version"
)

var (
	datedRegex       = regexp.MustCompile(`^\d{4}[-.]?\d{2}[-.]?\d{2}`)
	gitHashRegex     = regexp.MustCompile(`^[a-f0-9]{7,40}$`)
	buildNumberRegex = regexp.MustCompile(`^build[-_]?\d+$`)
)

func CalculatePriorityScore(tag string) float64 {
	lower := strings.ToLower(tag)
	if lower == "latest" || lower == "stable" || lower == "main" || lower == "prod" {
		return 5.0
	}
	if isDated(tag) {
		return 3.0 + normalizeDateScore(tag)
	}
	if v, err := version.NewVersion(tag); err == nil {
		return 4.0 + normalizeVersion(v)
	}
	if isGitHash(tag) || isBuildNumber(tag) {
		return 2.0
	}
	return 1.0
}

func normalizeVersion(v *version.Version) float64 {
	segs := v.Segments()
	if len(segs) == 0 {
		return 0
	}
	major := min(segs[0], 999)
	minor, patch := 0, 0
	if len(segs) > 1 {
		minor = min(segs[1], 999)
	}
	if len(segs) > 2 {
		patch = min(segs[2], 999)
	}
	return float64(major)/1000.0 + float64(minor)/1000000.0 + float64(patch)/1000000000.0
}

func normalizeDateScore(tag string) float64 {
	d := parseDate(tag)
	if d.IsZero() {
		return 0
	}
	score := float64(d.Year()-2000)*0.01 + float64(d.Month())*0.0001 + float64(d.Day())*0.000001
	if score > 0.999 {
		return 0.999
	}
	return score
}

func parseDate(tag string) time.Time {
	for _, layout := range []string{"2006-01-02", "2006.01.02", "20060102"} {
		if t, err := time.Parse(layout, tag); err == nil {
			return t
		}
	}
	return time.Time{}
}

func isDated(tag string) bool       { return datedRegex.MatchString(tag) }
func isGitHash(tag string) bool     { return gitHashRegex.MatchString(strings.ToLower(tag)) }
func isBuildNumber(tag string) bool { return buildNumberRegex.MatchString(strings.ToLower(tag)) }

func sortByPriority(jobs []TagJob) []TagJob {
	if len(jobs) == 0 {
		return []TagJob{}
	}
	jobsByRepo := make(map[uint][]TagJob)
	for _, j := range jobs {
		jobsByRepo[j.RepositoryID] = append(jobsByRepo[j.RepositoryID], j)
	}
	for repoID := range jobsByRepo {
		repoJobs := jobsByRepo[repoID]
		slices.SortFunc(repoJobs, func(a, b TagJob) int {
			if a.PriorityScore != b.PriorityScore {
				return cmp.Compare(b.PriorityScore, a.PriorityScore)
			}
			return cmp.Compare(a.TagName, b.TagName)
		})
		jobsByRepo[repoID] = repoJobs
	}
	maxLen := 0
	for _, rj := range jobsByRepo {
		if len(rj) > maxLen {
			maxLen = len(rj)
		}
	}
	result := make([]TagJob, 0, len(jobs))
	for i := range maxLen {
		for _, rj := range jobsByRepo {
			if i < len(rj) {
				result = append(result, rj[i])
			}
		}
	}
	return result
}

func filterBySchedule(jobs []TagJob, tagMap map[string]*store.Tag, now time.Time) []TagJob {
	var filtered []TagJob
	for _, j := range jobs {
		tag := tagMap[makeTagKey(j.RepositoryID, j.TagName)]
		if tag == nil || tag.NextCheckAt == nil || now.After(*tag.NextCheckAt) {
			filtered = append(filtered, j)
		}
	}
	return filtered
}

type registryScheduler struct {
	mu     sync.Mutex
	order  []string
	queues map[string][]TagJob
	next   int
	total  int
}

func newRegistryScheduler(jobs []TagJob) *registryScheduler {
	s := &registryScheduler{
		order:  make([]string, 0),
		queues: make(map[string][]TagJob),
		total:  len(jobs),
	}
	for _, j := range jobs {
		if _, ok := s.queues[j.RegistryName]; !ok {
			s.order = append(s.order, j.RegistryName)
		}
		s.queues[j.RegistryName] = append(s.queues[j.RegistryName], j)
	}
	return s
}

func (s *registryScheduler) Next() (TagJob, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.total == 0 || len(s.order) == 0 {
		return TagJob{}, false
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
	return TagJob{}, false
}
