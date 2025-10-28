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

import antfu from "@antfu/eslint-config"

export default antfu(
	{
		vue: {
			a11y: true,
		},
		stylistic: {
			indent: "tab",
			quotes: "double",
		},
		ignores: ["build", "node_modules"],
		rules: {
			"vue/block-order": [
				"error",
				{
					order: ["template", "script", "style"],
				},
			],
			"vue-a11y/label-has-for": [
				"error",
				{
					required: {
						some: ["nesting", "id"],
					},
					allowChildren: true,
				},
			],
		},
		extends: ["plugin:perfectionist/recommended-natural"],
	},
	{
		files: ["vite.config.ts"],
		rules: {
			"node/prefer-global/process": "off",
		},
	},
)
