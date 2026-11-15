import type { MaybeRefOrGetter, Ref } from "vue"
import { computed, ref, toValue } from "vue"

import type { Repository } from "~/types"

export interface HelmFileInfo {
	path: string
	size: number
}

interface HelmFilesResponse {
	files: HelmFileInfo[]
}

interface HelmFileResponse {
	path: string
	content: string
}

interface UseHelmChartOptions {
	registryHost: MaybeRefOrGetter<string>
	repository: MaybeRefOrGetter<Repository>
	tagName: MaybeRefOrGetter<string>
}

export function useHelmChart(opts: UseHelmChartOptions) {
	const loading = ref(false)
	const error = ref<string | null>(null)

	const baseUrl = computed(() => {
		const repo = toValue(opts.repository)
		const repoPath = repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name
		const reg = toValue(opts.registryHost).replaceAll(":", "~")
		const tag = encodeURIComponent(toValue(opts.tagName))
		return `/r/${reg}/${repoPath}/helm/${tag}`
	})

	async function fetchJson<T>(url: string): Promise<T | null> {
		loading.value = true
		error.value = null
		try {
			const resp = await fetch(url, {
				headers: { Accept: "application/json" },
			})
			if (!resp.ok) {
				const body = await resp.json().catch(() => ({}))
				throw new Error(body.error || `Request failed (${resp.status})`)
			}
			return (await resp.json()) as T
		} catch (e) {
			error.value = e instanceof Error ? e.message : String(e)
			return null
		} finally {
			loading.value = false
		}
	}

	function fetchFiles(): Promise<HelmFileInfo[] | null> {
		return fetchJson<HelmFilesResponse>(`${baseUrl.value}/files`).then(d => d?.files ?? null)
	}

	function fetchFile(path: string): Promise<string | null> {
		const url = `${baseUrl.value}/file?path=${encodeURIComponent(path)}`
		return fetchJson<HelmFileResponse>(url).then(d => d?.content ?? null)
	}

	return {
		loading,
		error: error as Ref<string | null>,
		fetchFiles,
		fetchFile,
	}
}
