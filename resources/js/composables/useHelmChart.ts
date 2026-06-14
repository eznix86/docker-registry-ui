import type { MaybeRefOrGetter, Ref } from "vue"
import type { Repository } from "~/types"
import { computed, ref, toValue } from "vue"

export interface HelmFile {
	path: string
	content: string
}

interface HelmFilesResponse {
	files: HelmFile[]
	chartYaml: string
}

interface HelmValuesResponse {
	content: string
}

interface UseHelmChartOptions {
	registryHost: MaybeRefOrGetter<string>
	namespace: MaybeRefOrGetter<string>
	repository: MaybeRefOrGetter<Repository>
	tagName: MaybeRefOrGetter<string>
}

export function useHelmChart(opts: UseHelmChartOptions) {
	const loading = ref(false)
	const error = ref<string | null>(null)

	const url = computed(() => {
		const repo = toValue(opts.repository)
		const repoPath = repo.namespace
			? `${repo.namespace}/${repo.name}`
			: repo.name
		const reg = toValue(opts.registryHost).replaceAll(":", "~")
		const tag = encodeURIComponent(toValue(opts.tagName))
		return {
			values: `/r/${reg}/${repoPath}/helm/${tag}/values`,
			files: `/r/${reg}/${repoPath}/helm/${tag}/files`,
		}
	})

	async function fetchJson<T>(suffix: "values" | "files"): Promise<T | null> {
		loading.value = true
		error.value = null
		try {
			const resp = await fetch(url.value[suffix], { headers: { Accept: "application/json" } })
			if (!resp.ok) {
				const body = await resp.json().catch(() => ({}))
				throw new Error(body.error || `Request failed (${resp.status})`)
			}
			return (await resp.json()) as T
		}
		catch (e) {
			error.value = e instanceof Error ? e.message : String(e)
			return null
		}
		finally {
			loading.value = false
		}
	}

	function fetchValues(): Promise<string | null> {
		return fetchJson<HelmValuesResponse>("values").then(d => d?.content ?? null)
	}

	function fetchFiles(): Promise<HelmFilesResponse | null> {
		return fetchJson<HelmFilesResponse>("files")
	}

	return { loading, error: error as Ref<string | null>, fetchValues, fetchFiles }
}
