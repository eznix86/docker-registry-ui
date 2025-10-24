// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

package repository

// StatsFilters captures the optional constraints that can be applied when
// querying repository statistics from the cache table. Each field maps to a UI
// filter so we can build the SQL dynamically instead of filtering in memory.
type StatsFilters struct {
	RegistryNames []string
	Architectures []string
	ShowUntagged  bool
	Search        string
}
