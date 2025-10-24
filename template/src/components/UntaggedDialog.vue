<template>
	<Teleport to="body">
		<Transition name="fade">
			<div
				v-if="isOpen"
				role="button"
				tabindex="0"
				class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
				aria-label="Close dialog"
				@click="close"
				@keydown.escape="close"
				@keydown.enter="close"
			>
				<div
					class="bg-background rounded-xl shadow-lg max-w-[900px] w-full mx-4 p-6"
					@click.stop
				>
					<h2 class="text-lg font-semibold text-warning mb-4">
						Untagged Repository
					</h2>

					<p class="text-foreground mb-6">
						This repository exists in the registry but contains no tagged images. Repositories without tags cannot be pulled or accessed through standard Docker commands.
					</p>

					<div class="bg-card border border-outline rounded-lg p-4 mb-4">
						<h3 class="font-semibold text-foreground mb-3">
							Cleanup Instructions
						</h3>

						<p class="text-muted-foreground mb-3">
							To remove this repository from the filesystem, execute the following command:
						</p>

						<CopyCommand
							:command="`rm -rf /var/lib/registry/docker/registry/v2/repositories/${repositoryName}`"
							:aria-label="`Copy cleanup command for ${repositoryName}`"
							class="mb-4"
						/>

						<p class="text-muted-foreground mb-3">
							After removing repositories, run garbage collection to reclaim storage space:
						</p>

						<CopyCommand
							command="registry garbage-collect /path/to/config.yml"
							aria-label="Copy garbage collect command"
						/>
					</div>

					<div class="flex justify-end">
						<button
							v-ripple
							class="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
							@click="close"
						>
							CLOSE
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { CopyCommand } from "~/components/ui"

interface UntaggedDialogProps {
	isOpen: boolean
	repositoryName: string
}

defineProps<UntaggedDialogProps>()

const emit = defineEmits<{
	close: []
}>()

function close() {
	emit("close")
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
