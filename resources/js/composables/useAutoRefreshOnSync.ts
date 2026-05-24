import { router } from "@inertiajs/vue3"
import { useDebounceFn } from "@vueuse/core"
import { watch } from "vue"
import { useSyncProgressStore } from "~/stores/useSyncProgressStore"

/**
 * Composable that automatically refreshes the current page when sync completes
 * Only refreshes if user is not actively refreshing (isRefreshing flag)
 */
export function useAutoRefreshOnSync() {
	const store = useSyncProgressStore()

	const reloadPage = useDebounceFn(() => {
		router.reload({ only: [] })
	}, 500)

	watch(() => store.done, (newValue, oldValue) => {
		if (newValue && !oldValue && !store.isRefreshing) {
			reloadPage()
		}
	})
}
