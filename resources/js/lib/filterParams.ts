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
