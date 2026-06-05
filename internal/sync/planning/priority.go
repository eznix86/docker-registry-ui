package planning

import (
	"cmp"
	"regexp"
	"slices"
	"strings"
	"time"

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

func SortByPriority(jobs []Job) []Job {
	if len(jobs) == 0 {
		return []Job{}
	}

	jobsByRepo := make(map[uint][]Job)
	for _, job := range jobs {
		jobsByRepo[job.RepositoryID] = append(jobsByRepo[job.RepositoryID], job)
	}

	for repoID := range jobsByRepo {
		repoJobs := jobsByRepo[repoID]
		slices.SortFunc(repoJobs, func(a, b Job) int {
			if a.PriorityScore != b.PriorityScore {
				return cmp.Compare(b.PriorityScore, a.PriorityScore)
			}
			return cmp.Compare(a.TagName, b.TagName)
		})
		jobsByRepo[repoID] = repoJobs
	}

	maxLen := 0
	for _, repoJobs := range jobsByRepo {
		if len(repoJobs) > maxLen {
			maxLen = len(repoJobs)
		}
	}

	result := make([]Job, 0, len(jobs))
	for i := range maxLen {
		for _, repoJobs := range jobsByRepo {
			if i < len(repoJobs) {
				result = append(result, repoJobs[i])
			}
		}
	}

	return result
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
