// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { router } from "@inertiajs/react";
import { dequal } from "dequal";
import { create } from "zustand";
import type { Repository, RepositoryFilters, Tag } from "~/types";
import { debounce } from "~/utils";

interface RepositoryState {
	// Remote state (from server)
	remoteRepository: Repository | null;
	remoteTags: { data: Tag[] };
	remoteFilters: RepositoryFilters;

	// Local state (UI)
	localSortBy: RepositoryFilters["sortBy"];
	localFilter: string;

	// Actions
	setRemoteRepository: (repository: Repository | null) => void;
	setRemoteTags: (tags: { data: Tag[] }) => void;
	setRemoteFilters: (filters: RepositoryFilters) => void;
	setSortBy: (sortBy: RepositoryFilters["sortBy"]) => void;
	setFilter: (filter: string) => void;
}

const performFilterRequest = (state: RepositoryState) => {
	const params: Record<string, string> = {};

	if (state.localSortBy !== "newest") {
		params.sortBy = state.localSortBy;
	}

	if (state.localFilter) {
		params.filter = state.localFilter;
	}

	const currentPath = window.location.pathname;

	router.get(currentPath, params, {
		preserveScroll: true,
		preserveState: true,
		replace: true,
		only: ["tags", "filters"],
		reset: ["tags"],
	});
};

/**
 * Debounced version of performFilterRequest for filter input
 */
const debouncedFilterRequest = debounce(performFilterRequest);

export const useRepositoryStore = create<RepositoryState>((set, get) => ({
	remoteRepository: null,
	remoteTags: { data: [] },
	remoteFilters: {
		sortBy: "newest",
		filter: "",
	},
	localSortBy: "newest",
	localFilter: "",

	setRemoteRepository: (repository) =>
		set((state) => {
			if (dequal(state.remoteRepository, repository)) {
				return state;
			}
			return { remoteRepository: repository };
		}),

	setRemoteTags: (tags) =>
		set((state) => {
			if (dequal(state.remoteTags, tags)) {
				return state;
			}
			return { remoteTags: tags };
		}),

	setRemoteFilters: (filters) =>
		set((state) => {
			if (dequal(state.remoteFilters, filters)) {
				return state;
			}
			return {
				remoteFilters: filters,
				localSortBy: filters.sortBy,
				localFilter: filters.filter,
			};
		}),

	setSortBy: (sortBy) => {
		set({ localSortBy: sortBy });
		performFilterRequest({ ...get(), localSortBy: sortBy });
	},

	setFilter: (filter) => {
		set({ localFilter: filter });
		debouncedFilterRequest({ ...get(), localFilter: filter });
	},
}));

// Selector hooks
export const useLocalSortBy = () =>
	useRepositoryStore((state) => state.localSortBy);
export const useLocalFilter = () =>
	useRepositoryStore((state) => state.localFilter);
export const useSetSortBy = () =>
	useRepositoryStore((state) => state.setSortBy);
export const useSetFilter = () =>
	useRepositoryStore((state) => state.setFilter);
