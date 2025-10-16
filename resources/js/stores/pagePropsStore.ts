// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { dequal } from "dequal";
import { create } from "zustand";
import type { Repository, Tag } from "~/types";

interface PagePropsState {
	// Repository page data
	repository: Repository | null;
	tags: { data: Tag[] };

	// Actions
	setRepository: (repository: Repository | null) => void;
	setTags: (tags: { data: Tag[] }) => void;
}

export const usePagePropsStore = create<PagePropsState>((set) => ({
	repository: null,
	tags: { data: [] },

	setRepository: (repository) =>
		set((state) => {
			if (dequal(state.repository, repository)) {
				return state;
			}
			return { repository };
		}),

	setTags: (tags) =>
		set((state) => {
			if (dequal(state.tags, tags)) {
				return state;
			}
			return { tags };
		}),
}));

// Selector hooks
export const useRepository = () =>
	usePagePropsStore((state) => state.repository);
export const useTags = () => usePagePropsStore((state) => state.tags);
