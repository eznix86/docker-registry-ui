// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

export function buildFilterParams(
	filters: Record<string, string | string[] | boolean | number | null | undefined>,
): Record<string, string> {
	const params: Record<string, string> = {}

	for (const [key, value] of Object.entries(filters)) {
		if (value === null || value === undefined || value === false || value === "") {
			continue
		}

		if (Array.isArray(value)) {
			if (value.length > 0) {
				params[key] = value.join(",")
			}
		}
		else if (typeof value === "boolean") {
			params[key] = "true"
		}
		else {
			params[key] = String(value)
		}
	}

	return params
}
