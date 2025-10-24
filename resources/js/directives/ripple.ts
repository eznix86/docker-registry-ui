// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

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
