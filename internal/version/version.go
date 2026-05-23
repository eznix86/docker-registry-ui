package version

import (
	"fmt"
	"runtime"
	"runtime/debug"
	"time"
)

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
	commit := GitCommit
	if commit == "" {
		if bi, ok := debug.ReadBuildInfo(); ok {
			for _, s := range bi.Settings {
				if s.Key == "vcs.revision" {
					commit = s.Value
					if len(commit) > 7 {
						commit = commit[:7]
					}
					break
				}
			}
		}
	}
	if commit == "" {
		commit = "dev"
	}
	return commit
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
