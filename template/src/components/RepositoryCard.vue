<template>
	<component
		:is="repository.isUntagged ? 'button' : RouterLink"
		:to="repository.isUntagged ? undefined : `/r`"
		:class="repository.isUntagged ? 'block w-full text-left' : 'block'"
		:aria-label="`${repository.isUntagged ? 'Show untagged repository information for' : 'View details for'} ${repository.name} repository`"
		@click="repository.isUntagged ? handleUntaggedClick() : undefined"
	>
		<Card v-ripple variant="interactive" class="p-3 h-42" :class="[repository.isUntagged && 'cursor-help']">
			<CardHeader>{{ repository.name }}</CardHeader>

			<CardBody>
				<div class="flex flex-wrap gap-1">
					<Chip v-if="repository.isUntagged" variant="warning">
						untagged
					</Chip>
					<Chip v-for="arch in repository.architectures" :key="arch">
						{{ arch }}
					</Chip>
				</div>
			</CardBody>

			<CardFooter>
				<span class="text-muted-foreground font-medium">Size <span class="text-xs font-normal">{{ repository.size }}</span></span>
				<span class="text-muted-foreground italic text-xs">{{ repository.registry }}</span>
			</CardFooter>
		</Card>
	</component>
</template>

<script setup lang="ts">
import type { Repository } from "~/types/repository"
import { RouterLink } from "vue-router"
import { Card, CardBody, CardFooter, CardHeader, Chip } from "~/components/ui"

const props = defineProps<{
	repository: Repository
}>()

const emit = defineEmits<{
	untaggedClick: [repository: Repository]
}>()

function handleUntaggedClick() {
	emit("untaggedClick", props.repository)
}
</script>
