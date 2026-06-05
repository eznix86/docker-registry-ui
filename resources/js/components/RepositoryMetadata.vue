<template>
	<div class="mb-6 border-b border-outline pb-6 sm:mb-8 sm:pb-8">
		<div v-if="isHelmRepository" class="space-y-4 text-sm sm:text-base">
			<div class="space-y-3 sm:hidden">
				<div class="flex items-center justify-between gap-4">
					<span class="text-muted-foreground">Versions available</span>
					<span class="font-bold text-foreground tabular-nums">{{ tagsCount }}</span>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-muted-foreground">Total size</span>
					<span class="font-bold text-foreground">{{ formattedSize }}</span>
				</div>
				<div class="flex items-center justify-between gap-4">
					<span class="text-muted-foreground">Chart</span>
					<span class="text-right font-bold text-foreground">{{ helmName }}</span>
				</div>
			</div>

			<div class="hidden gap-6 text-base text-foreground sm:flex sm:flex-wrap sm:items-center">
				<span><strong class="font-bold tabular-nums">{{ tagsCount }}</strong> versions available</span>
				<span>Total size: <strong class="font-bold">{{ formattedSize }}</strong></span>
				<span>Chart: <strong class="font-bold">{{ helmName }}</strong></span>
			</div>
		</div>

		<template v-else>
			<div class="sm:hidden space-y-3 text-sm">
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Tags available</span>
					<span class="font-bold text-foreground">{{ tagsCount }}</span>
				</div>
				<div class="flex items-center justify-between">
					<span class="text-muted-foreground">Total size</span>
					<span class="font-bold text-foreground">{{ formattedSize }}</span>
				</div>
				<div>
					<div class="mb-2 flex items-center justify-between">
						<span class="text-muted-foreground">Architectures</span>
						<span class="font-bold text-foreground">{{ architectures.length }}</span>
					</div>
					<div class="relative">
						<div class="mt-8 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
							<Chip v-for="arch in architectures" :key="arch" variant="primary" size="normal">
								{{ arch }}
							</Chip>
						</div>
						<div class="absolute bottom-0 left-0 top-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none" />
						<div class="absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none" />
					</div>
				</div>
			</div>

			<div class="hidden gap-6 text-base text-foreground sm:flex sm:items-center">
				<span><strong class="font-bold">{{ tagsCount }}</strong> tags available</span>
				<span>Total size: <strong class="font-bold">{{ formattedSize }}</strong></span>
				<div class="flex items-center gap-2">
					<span class="flex-shrink-0">Architectures:</span>
					<div class="flex flex-wrap gap-2">
						<Chip v-for="arch in architectures" :key="arch" variant="primary" size="normal">
							{{ arch }}
						</Chip>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<script setup lang="ts">
import type { Repository } from "~/types"
import { computed } from "vue"
import { Chip } from "~/components/ui"
import { normalizeArray } from "~/lib/normalize"
import { formatBytes, repositoryName as formatRepositoryName } from "~/lib/utils"

interface RepositoryMetadataProps {
	repository: Repository
	isHelmRepository?: boolean
	helmChartName?: string
}

const props = defineProps<RepositoryMetadataProps>()

const tagsCount = computed(() => props.repository.tagsCount)
const totalSizeInBytes = computed(() => props.repository.totalSizeInBytes || 0)
const formattedSize = computed(() => formatBytes(totalSizeInBytes.value))
const architectures = computed(() => normalizeArray(props.repository.architectures))
const isHelmRepository = computed(() => props.isHelmRepository === true)
const helmName = computed(() => props.helmChartName || formatRepositoryName(props.repository))
</script>
