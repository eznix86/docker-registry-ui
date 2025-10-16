// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { dequal } from "dequal";
import { create } from "zustand";
import type { Repository } from "~/types";

interface ExploreState {
	// Repository data from server
	repositories: Repository[];
	totalRepositories: number;

	// Actions
	setRepositories: (repositories: Repository[]) => void;
	setTotalRepositories: (total: number) => void;
}

export const useExploreStore = create<ExploreState>((set) => ({
	repositories: [],
	totalRepositories: 0,

	setRepositories: (repositories) =>
		set((state) => {
			if (dequal(state.repositories, repositories)) {
				return state;
			}
			return { repositories };
		}),

	setTotalRepositories: (total) =>
		set((state) => {
			if (state.totalRepositories === total) {
				return state;
			}
			return { totalRepositories: total };
		}),
}));
