
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
