
import { router } from "@inertiajs/vue3"
import { useDebounceFn, useTimeoutFn } from "@vueuse/core"
import { defineStore } from "pinia"
import { computed, ref, watch } from "vue"

export interface SyncProgressUpdate {
	completed: number
	total: number
	message: string
	step: string
	done: boolean
}

export const useSyncProgressStore = defineStore("syncProgress", () => {
	const completed = ref(0)
	const total = ref(0)
	const message = ref("")
	const step = ref("")
	const done = ref(false)
	const connected = ref(false)
	const isRefreshing = ref(false)
	const hideAfterComplete = ref(false)

	let ws: WebSocket | null = null
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null

	const percent = computed(() => {
		if (total.value === 0)
			return 0
		return (completed.value / total.value) * 100
	})

	const isLoading = computed(() => {
		return (connected.value && total.value > 0 && !done.value) || isRefreshing.value
	})

	// Actions
	function connect() {
		if (ws && ws.readyState !== WebSocket.CLOSED) {
			return
		}

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:"
		const wsUrl = `${protocol}//${window.location.host}/ws/sync/progress`

		ws = new WebSocket(wsUrl)

		ws.onopen = () => {
			connected.value = true
		}

		ws.onmessage = (event) => {
			try {
				const update: SyncProgressUpdate = JSON.parse(event.data)
				completed.value = update.completed
				total.value = update.total
				message.value = update.message
				step.value = update.step
				done.value = update.done
			}
			catch (error) {
				console.error("Failed to parse sync progress update:", error)
			}
		}

		ws.onerror = (error) => {
			console.error("WebSocket error:", error)
		}

		ws.onclose = () => {
			connected.value = false
			ws = null

			reconnectTimer = setTimeout(() => {
				connect()
			}, 3000)
		}
	}

	const resetRefreshing = useDebounceFn(() => {
		isRefreshing.value = false
	}, 1000)

	const { start: startHideTimer, stop: stopHideTimer } = useTimeoutFn(() => {
		hideAfterComplete.value = true
	}, 1500, { immediate: false })

	watch(done, (newValue, oldValue) => {
		if (newValue) {
			isRefreshing.value = false
		}
		if (newValue && !oldValue) {
			startHideTimer()
		}
		else if (!newValue && oldValue) {
			stopHideTimer()
			hideAfterComplete.value = false
		}
	})

	function refresh() {
		isRefreshing.value = true

		router.reload({
			only: [],
			onFinish: () => {
				resetRefreshing()
			},
		})
	}

	function disconnect() {
		if (reconnectTimer) {
			clearTimeout(reconnectTimer)
			reconnectTimer = null
		}
		if (ws) {
			ws.close()
			ws = null
		}
	}

	return {
		// State
		completed,
		total,
		message,
		step,
		done,
		connected,
		isRefreshing,
		hideAfterComplete,
		// Computed
		percent,
		isLoading,
		// Actions
		connect,
		refresh,
		disconnect,
	}
})
