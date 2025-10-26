// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { MaybeRefOrGetter } from "vue"
import type { Repository } from "~/types"
import { computed, toValue } from "vue"

export function useRepositoryName(repository: MaybeRefOrGetter<Repository | null | undefined>) {
	return computed(() => {
		const repo = toValue(repository)
		if (!repo)
			return ""
		if (repo.namespace && repo.namespace !== repo.name) {
			return `${repo.namespace}/${repo.name}`
		}
		return repo.name
	})
}
