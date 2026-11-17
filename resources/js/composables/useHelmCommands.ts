import type { MaybeRefOrGetter } from "vue"
import { computed, toValue } from "vue"

import { useRepositoryName } from "~/composables/useRepositoryName"
import type { Repository } from "~/types"

export function useHelmCommands(repository: MaybeRefOrGetter<Repository>, version: MaybeRefOrGetter<string>) {
	const repositoryName = useRepositoryName(repository)
	const chartRef = computed(() => {
		const repo = toValue(repository)
		return `oci://${repo.registryPublicHost ?? repo.registryHost}/${repositoryName.value}`
	})

	return {
		install: computed(() => `helm install <release-name> ${chartRef.value} --version ${toValue(version)}`),
		pull: computed(() => `helm pull ${chartRef.value} --version ${toValue(version)}`),
		showValues: computed(() => `helm show values ${chartRef.value} --version ${toValue(version)} > values.yaml`),
	}
}
