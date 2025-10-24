// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import React from "react"
import { random } from "../utils"

export function useRandomInterval(callback: () => void,	minDelay: number | null,	maxDelay: number | null) {
	const timeoutId = React.useRef<number | undefined>(undefined)
	const savedCallback = React.useRef(callback)

	React.useEffect(() => {
		savedCallback.current = callback
	}, [callback])

	React.useEffect(() => {
		const isEnabled
			= typeof minDelay === "number" && typeof maxDelay === "number"

		if (isEnabled) {
			const handleTick = () => {
				const nextTickAt = random(minDelay as number, maxDelay as number)

				timeoutId.current = window.setTimeout(() => {
					savedCallback.current()
					handleTick()
				}, nextTickAt)
			}

			handleTick()
		}

		return () => window.clearTimeout(timeoutId.current)
	}, [minDelay, maxDelay])

	const cancel = React.useCallback(() => {
		window.clearTimeout(timeoutId.current)
	}, [])

	return cancel
}
