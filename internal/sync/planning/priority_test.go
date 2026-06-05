package planning

import (
	"testing"
	"time"

	"github.com/eznix86/docker-registry-ui/internal/store"
)

const dueTagName = "due"

func TestCalculatePriorityScoreOrder(t *testing.T) {
	t.Helper()

	latest := CalculatePriorityScore("latest")
	versioned := CalculatePriorityScore("1.2.3")
	dated := CalculatePriorityScore("2024-05-20")
	build := CalculatePriorityScore("build-42")
	other := CalculatePriorityScore("feature-branch")

	if latest <= versioned {
		t.Fatalf("expected latest score %f to be greater than versioned %f", latest, versioned)
	}
	if versioned <= dated {
		t.Fatalf("expected versioned score %f to be greater than dated %f", versioned, dated)
	}
	if dated <= build {
		t.Fatalf("expected dated score %f to be greater than build %f", dated, build)
	}
	if build <= other {
		t.Fatalf("expected build score %f to be greater than other %f", build, other)
	}
}

func TestJobRepoPath(t *testing.T) {
	t.Helper()

	job := Job{JobInput: JobInput{Namespace: "library", RepoName: "nginx"}}
	if got := job.RepoPath(); got != "library/nginx" {
		t.Fatalf("expected repo path library/nginx, got %q", got)
	}

	job = Job{JobInput: JobInput{RepoName: "busybox"}}
	if got := job.RepoPath(); got != "busybox" {
		t.Fatalf("expected repo path busybox, got %q", got)
	}
}

func TestSortByPriority(t *testing.T) {
	t.Helper()

	jobs := []Job{
		{JobInput: JobInput{TagName: "v1"}, RepositoryID: 1, PriorityScore: 1},
		{JobInput: JobInput{TagName: "v2"}, RepositoryID: 1, PriorityScore: 2},
		{JobInput: JobInput{TagName: "a"}, RepositoryID: 2, PriorityScore: 3},
	}

	sorted := SortByPriority(jobs)
	if len(sorted) != 3 {
		t.Fatalf("expected 3 jobs, got %d", len(sorted))
	}

	if sorted[0].RepositoryID != 1 || sorted[0].TagName != "v2" {
		t.Fatalf("expected highest-priority repo 1 job first, got repo=%d tag=%q", sorted[0].RepositoryID, sorted[0].TagName)
	}
	if sorted[1].RepositoryID != 2 || sorted[1].TagName != "a" {
		t.Fatalf("expected repo 2 job second, got repo=%d tag=%q", sorted[1].RepositoryID, sorted[1].TagName)
	}
	if sorted[2].RepositoryID != 1 || sorted[2].TagName != "v1" {
		t.Fatalf("expected remaining repo 1 job last, got repo=%d tag=%q", sorted[2].RepositoryID, sorted[2].TagName)
	}
}

func TestFilterBySchedule(t *testing.T) {
	t.Helper()

	now := time.Now()
	future := now.Add(time.Hour)
	past := now.Add(-time.Hour)

	jobs := []Job{
		{RepositoryID: 1, JobInput: JobInput{TagName: "new"}},
		{RepositoryID: 1, JobInput: JobInput{TagName: dueTagName}},
		{RepositoryID: 1, JobInput: JobInput{TagName: "later"}},
	}

	tagMap := map[tagKey]*store.Tag{
		newTagKey(1, dueTagName): {
			RepositoryID: 1,
			Name:         dueTagName,
			NextCheckAt:  &past,
		},
		newTagKey(1, "later"): {
			RepositoryID: 1,
			Name:         "later",
			NextCheckAt:  &future,
		},
	}

	filtered := filterBySchedule(jobs, tagMap, now)
	if len(filtered) != 2 {
		t.Fatalf("expected 2 jobs after schedule filter, got %d", len(filtered))
	}
	if filtered[0].TagName != "new" {
		t.Fatalf("expected unscheduled job first, got %q", filtered[0].TagName)
	}
	if filtered[1].TagName != "due" {
		t.Fatalf("expected overdue job second, got %q", filtered[1].TagName)
	}
}
