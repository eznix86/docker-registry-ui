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

export function useRipple() {
	const createRipple = (e: MouseEvent, element: HTMLElement) => {
		const ripple = document.createElement("span")
		ripple.classList.add("ripple-effect")
		element.appendChild(ripple)

		const rect = element.getBoundingClientRect()
		const x = e.clientX - rect.left
		const y = e.clientY - rect.top

		ripple.style.left = `${x}px`
		ripple.style.top = `${y}px`
		ripple.style.width = "20px"
		ripple.style.height = "20px"

		setTimeout(() => {
			ripple.remove()
		}, 600)
	}

	return { createRipple }
}
