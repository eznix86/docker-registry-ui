package version

import (
	"fmt"
	"runtime"
	"runtime/debug"
	"time"
)

//nolint:gochecknoglobals // These variables are set at build time via -ldflags -X.
var (
	BuildTime = ""
	GitCommit = ""
	Version   = ""
)

type Info struct{}

func New() *Info {
	return &Info{}
}

func (i *Info) Short() string {
	if Version != "" {
		return Version
	}
	if commit := resolveCommit(); commit != "" {
		return commit
	}
	return "dev"
}

func resolveCommit() string {
	if GitCommit != "" {
		return GitCommit
	}
	return readCommitFromBuildInfo()
}

func readCommitFromBuildInfo() string {
	bi, ok := debug.ReadBuildInfo()
	if !ok {
		return ""
	}
	for _, s := range bi.Settings {
		if s.Key != "vcs.revision" {
			continue
		}
		commit := s.Value
		if len(commit) > 7 {
			commit = commit[:7]
		}
		return commit
	}
	return ""
}

func (i *Info) String() string {
	if Version != "" {
		return fmt.Sprintf("%s (%s) %s/%s built %s",
			"container-hub", Version, runtime.GOOS, runtime.GOARCH, buildTime())
	}
	return fmt.Sprintf("%s (%s) %s/%s built %s",
		"container-hub", i.Short(), runtime.GOOS, runtime.GOARCH, buildTime())
}

func buildTime() string {
	if BuildTime != "" {
		return BuildTime
	}
	return time.Now().Format(time.RFC3339)
}
