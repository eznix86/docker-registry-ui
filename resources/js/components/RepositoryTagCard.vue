<template>
	<div class="border border-outline rounded-lg bg-card p-4 sm:p-6 has-[.tag-aliases]:pb-4">
		<!-- Tag Header -->
		<div
			class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 has-[+.tag-aliases]:pb-1"
		>
			<div
				class="flex items-center justify-between sm:justify-start gap-3 sm:gap-4"
			>
				<div
					class="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 min-w-0"
				>
					<h2 class="text-lg font-semibold leading-7 text-primary">
						{{ tag.name }}
					</h2>
					<span class="text-sm text-muted-foreground">Last updated {{ lastUpdated }}</span>
				</div>
				<button
					v-if="!disableTagDeletion"
					v-ripple
					class="p-2 hover:bg-muted rounded transition-colors shrink-0 sm:order-last effect-hover-destructive effect-ripple-destructive"
					:aria-label="`Delete tag ${tag.name}`"
					:title="`Delete tag ${tag.name}`"
					@click="emit('deleteTag', tag)"
				>
					<svg
						class="w-5 h-5 text-destructive"
						fill="currentColor"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<path
							d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
						/>
					</svg>
				</button>
			</div>
			<CopyCommand
				:command="pullCommand"
				:aria-label="`Copy command for ${tag.name}`"
			/>
		</div>

		<!-- Aliases Display -->
		<div
			v-if="tag.alias && tag.alias.length > 0"
			class="tag-aliases flex gap-1.5 items-center flex-wrap pb-4"
		>
			<Chip
				v-for="alias in tag.alias"
				:key="alias"
				variant="primary"
				size="small"
				class="border-outline/90 text-info/90"
			>
				{{ alias }}
			</Chip>
		</div>

		<!-- Helm Chart Metadata -->
		<div v-if="tag.kind === 'helm'" class="border border-primary/20 rounded-lg bg-primary/5 p-4 flex items-start gap-3">
			<svg class="w-5 h-5 shrink-0 mt-0.5" viewBox="0 0 16 16" fill="currentColor"><path d="M4.807 4.377l.016.015-.147.147a11.93 11.93 0 00-.314.324c-.197.213-.372.452-.389.52h.91a.132.132 0 00.109-.049A4.1 4.1 0 017.778 4a4.14 4.14 0 013.317 1.336.112.112 0 00.089.047l.595-.001h.295a.31.31 0 00.047-.009 4.982 4.982 0 00-.745-.864l.013-.013a3.006 3.006 0 00.72-.823c.135-.213.237-.446.3-.69a.838.838 0 00.022-.29c-.013-.132-.086-.243-.262-.222a.484.484 0 00-.103.023 1.058 1.058 0 00-.33.193 3.043 3.043 0 00-.922 1.31l-.014.03-.006.011c-.054-.03-.108-.062-.16-.093-.122-.07-.24-.14-.364-.202-.18-.09-.364-.17-.553-.24a5.217 5.217 0 00-.982-.247c-.061-.01-.122-.02-.183-.032a3.15 3.15 0 00.038-1.482 1.486 1.486 0 00-.147-.41.484.484 0 00-.163-.19.197.197 0 00-.225.002.44.44 0 00-.089.08.877.877 0 00-.153.284c-.068.197-.11.402-.125.61a3.15 3.15 0 00.083 1.073l.004.023a4.938 4.938 0 00-2.268.696l-.009-.007a.029.029 0 01-.007-.007 3.15 3.15 0 00-.62-.96 1.752 1.752 0 00-.494-.397.765.765 0 00-.16-.062c-.177-.043-.298.049-.31.23l-.001.023v.016c-.007.14.028.272.074.402.166.464.439.856.792 1.196l.035.033zM11.376 11.502c.249-.23.474-.485.67-.76l-.004-.017h-.294c-.2 0-.4.001-.6-.002a.216.216 0 00-.168.069c-.95.928-2.086 1.328-3.405 1.2a3.918 3.918 0 01-1.392-.414 4.113 4.113 0 01-1.103-.809.13.13 0 00-.104-.045l-.616.001h-.267a.383.383 0 00-.064.005c.23.323.497.617.797.877a.105.105 0 01-.01.018l-.025.023-.014.014a3.15 3.15 0 00-.742 1.057 1.552 1.552 0 00-.121.4.555.555 0 00.02.294.199.199 0 00.15.125c.062.01.125.004.183-.02a1.07 1.07 0 00.337-.194c.376-.313.673-.71.865-1.16l.02-.044.011-.024a4.93 4.93 0 002.267.7l.003.01c.002.005.003.008.002.01a2.645 2.645 0 00-.091.582c-.016.248-.003.497.038.741.032.18.076.356.162.517.03.057.067.11.11.158.108.118.241.117.353.002a.375.375 0 00.065-.084c.044-.079.083-.16.117-.244.07-.203.112-.415.124-.63a3.057 3.057 0 00-.092-1.059l-.004-.022c.268-.03.533-.08.793-.15.255-.072.505-.163.747-.273a5.44 5.44 0 00.7-.392l.009.022.011.03c.184.512.503.964.923 1.308.08.064.165.118.257.163.06.029.123.048.19.056a.202.202 0 00.228-.14.418.418 0 00.02-.104.969.969 0 00-.061-.403 3.032 3.032 0 00-.943-1.348l-.052-.044zM10.82 6.537l.072.001c.053.001.105.003.156-.002.084-.008.144.022.205.079.266.245.534.488.802.73l.264.24c.011.01.024.02.037.033l.022.019.02-.018.04-.035 1.1-1.002a.152.152 0 01.117-.046 3.946 3.946 0 00.276.001v2.95a6.801 6.801 0 01-.774.002V7.995l-.015-.007-.763.696-.769-.693-.015.005v1.499h-.768c-.014-.05-.02-2.79-.006-2.958zM4.497 6.54h-.763v1.046a9.595 9.595 0 01-.95-.004v-1.04h-.77v2.947c.064.015.716.014.774-.004V8.373h.946V9.116c0 .126-.001.253.002.38H4.5c.016-.072.013-2.906-.003-2.955zM5.412 9.494V6.55c.045-.014 1.723-.02 1.833-.005v.627l-.015.002h-.008a.578.578 0 01-.052.003h-.98v.489h.934v.65h-.926a3.5 3.5 0 00-.007.55l.023.001c.017.002.034.003.052.003h.979v.625H5.412zM8.123 6.54c-.014.055-.017 2.876-.003 2.955h1.832v-.772h-.985l-.053-.003-.03-.002V6.541h-.761z" /></svg>
			<div>
				<div class="flex items-center gap-2 mb-1">
					<span class="text-sm font-semibold text-foreground">{{ tag.chartName || tag.name }}</span>
					<span class="text-xs text-muted-foreground">{{ tag.chartVersion || '' }}</span>
					<Chip variant="primary" size="small" class="text-[10px]">
						Helm
					</Chip>
				</div>
				<p v-if="tag.chartDesc" class="text-xs text-muted-foreground">
					{{ tag.chartDesc }}
				</p>
			</div>
		</div>

		<!-- Digest Table -->
		<div v-if="tag.kind !== 'helm'" class="border border-outline rounded-lg overflow-x-auto">
			<table class="w-full border-collapse bg-background min-w-[500px]">
				<thead class="text-left text-sm text-muted-foreground">
					<tr>
						<th
							class="py-1.5 px-4 font-semibold border-b border-outline"
						>
							Digest
						</th>
						<th
							class="py-1.5 px-4 font-semibold border-b border-outline"
						>
							OS/ARCH
						</th>
						<th
							class="py-1.5 px-4 font-semibold border-b border-outline"
						>
							Size
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-if="!hasImageMetadata"
						class="hover:bg-muted transition-colors"
					>
						<td class="py-3 px-4 text-sm text-primary border-b border-outline">
							{{ shortDigest }}
						</td>
						<td class="py-3 px-4 text-sm text-muted-foreground border-b border-outline">
							Manifest metadata unavailable
						</td>
						<td class="py-3 px-4 text-sm text-muted-foreground border-b border-outline">
							Unknown
						</td>
					</tr>
					<tr
						v-for="(image, idx) in tag.images"
						:key="idx"
						class="hover:bg-muted transition-colors"
					>
						<td
							class="py-1.5 px-4 text-sm text-primary border-b border-outline"
						>
							{{ image.digest.substring(0, 19) }}
						</td>
						<td
							class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline"
						>
							{{ image.os }}/{{ image.architecture
							}}{{ image.variant ? `/${image.variant}` : "" }}
						</td>
						<td
							class="py-1.5 px-4 text-sm text-muted-foreground border-b border-outline"
						>
							<span v-if="image.stub" class="inline-flex items-center gap-1">
								<span class="text-xs text-muted-foreground/50">~</span>{{ formatBytes(image.size) }}
								<span class="text-[10px] text-muted-foreground/40">(index)</span>
							</span>
							<span v-else>{{ formatBytes(image.size) }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Repository, Tag } from "~/types"
import { useTimeAgo } from "@vueuse/core"
import { computed } from "vue"
import Chip from "~/components/ui/Chip.vue"
import CopyCommand from "~/components/ui/CopyCommand.vue"
import { usePreferences } from "~/composables/usePreferences"
import { useRepositoryName } from "~/composables/useRepositoryName"
import { formatBytes } from "~/lib/utils"

interface RepositoryTagCardProps {
	tag: Tag
	repository: Repository
	disableTagDeletion: boolean
}

const props = defineProps<RepositoryTagCardProps>()
const emit = defineEmits<{ deleteTag: [tag: Tag] }>()

const { getPullCommand } = usePreferences()

const registryHost = computed(() => props.repository.registryHost)
const repositoryName = useRepositoryName(() => props.repository)

const pullCommand = computed(() => {
	if (props.tag.kind === "helm") {
		const ref = `${registryHost.value}/${repositoryName.value}`
		return `helm install ${props.tag.chartName || props.tag.name} oci://${ref} --version ${props.tag.chartVersion || props.tag.name}`
	}
	return getPullCommand(registryHost.value, repositoryName.value, props.tag.name)
})

const hasImageMetadata = computed(() => props.tag.metadataAvailable && props.tag.images.length > 0)

const shortDigest = computed(() => props.tag.digest.substring(0, 19))

const lastUpdated = computed(() => {
	if (!props.tag.createdAt || props.tag.createdAt.startsWith("0001-01-01")) {
		return "Unknown"
	}
	const date = new Date(props.tag.createdAt)
	return useTimeAgo(date).value
})
</script>
