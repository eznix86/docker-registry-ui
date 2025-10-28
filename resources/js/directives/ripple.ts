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

import type { Directive } from "vue"

export const vRipple: Directive = {
	mounted(el: HTMLElement) {
		if (getComputedStyle(el).position === "static") {
			el.style.position = "relative"
		}
		el.style.overflow = "hidden"

		el.addEventListener("mousedown", (event: MouseEvent) => {
			const rect = el.getBoundingClientRect()

			const clickX = event.clientX - rect.left
			const clickY = event.clientY - rect.top

			const size
				= Math.max(
					Math.sqrt(clickX ** 2 + clickY ** 2),
					Math.sqrt((rect.width - clickX) ** 2 + clickY ** 2),
					Math.sqrt(clickX ** 2 + (rect.height - clickY) ** 2),
					Math.sqrt((rect.width - clickX) ** 2 + (rect.height - clickY) ** 2),
				) * 2

			const x = clickX - size / 2
			const y = clickY - size / 2

			const ripple = document.createElement("span")
			ripple.className = "v-ripple"
			ripple.style.left = `${x}px`
			ripple.style.top = `${y}px`
			ripple.style.width = `${size}px`
			ripple.style.height = `${size}px`

			el.appendChild(ripple)

			ripple.addEventListener("animationend", () => {
				ripple.remove()
			})
		})
	},
}
