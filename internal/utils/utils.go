// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

package utils

import (
	"bufio"
	"fmt"
	"os"
	"strings"
)

func StrPtr(s string) *string {
	return &s
}

func IsInContainerContext() bool {
	// Docker/Podman markers
	if fileExists("/.dockerenv") || fileExists("/run/.containerenv") {
		return true
	}

	// cgroup hints
	if inCgroupHints("/proc/1/cgroup") || inCgroupHints("/proc/self/cgroup") {
		return true
	}

	// Kubernetes hint
	if os.Getenv("KUBERNETES_SERVICE_HOST") != "" {
		return true
	}

	// Generic "container" env var used by some distros
	if os.Getenv("container") != "" {
		return true
	}

	return false
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

func inCgroupHints(path string) bool {
	// #nosec G304 -- path is from hardcoded system paths (/proc/1/cgroup or /proc/self/cgroup) for container detection
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer (func() {
		err := f.Close()
		if err != nil {
			fmt.Println("Unable to close file")
		}
	})()

	sc := bufio.NewScanner(f)
	for sc.Scan() {
		line := sc.Text()
		if strings.Contains(line, "docker") ||
			strings.Contains(line, "containerd") ||
			strings.Contains(line, "podman") ||
			strings.Contains(line, "kubepods") {
			return true
		}
	}
	return false
}
