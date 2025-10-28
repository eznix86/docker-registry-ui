<!--
SPDX-License-Identifier: AGPL-3.0-or-later
Copyright (C) 2025  Bruno Bernard

This file is part of Docker Registry UI (Container Hub).

Docker Registry UI is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

Docker Registry UI is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
	<Teleport to="body">
		<Transition name="fade">
			<div
				v-if="untaggedDialogStore.isOpen"
				role="button"
				tabindex="0"
				class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
				aria-label="Close dialog"
				@click="untaggedDialogStore.closeDialog"
				@keydown.escape="untaggedDialogStore.closeDialog"
				@keydown.enter="untaggedDialogStore.closeDialog"
			>
				<div
					class="bg-background rounded-xl shadow-lg max-w-[900px] w-full mx-4 p-6"
					@click.stop
				>
					<h2 class="text-lg font-semibold text-warning mb-4">
						Untagged Repository
					</h2>

					<p class="text-foreground mb-6">
						This repository exists in the registry but contains no
						tagged images. Repositories without tags cannot be
						pulled or accessed through standard Docker commands.
					</p>

					<div
						class="bg-card border border-outline rounded-lg p-4 mb-4"
					>
						<h3 class="font-semibold text-foreground mb-3">
							Cleanup Instructions
						</h3>

						<p class="text-muted-foreground mb-3">
							To remove this repository from the filesystem,
							execute the following command:
						</p>

						<CopyCommand
							:command="`rm -rf /var/lib/registry/docker/registry/v2/repositories/${untaggedDialogStore.selectedRepository?.name || ''}`"
							:aria-label="`Copy cleanup command for ${untaggedDialogStore.selectedRepository?.name || ''}`"
							class="mb-4"
						/>

						<p class="text-muted-foreground mb-3">
							After removing repositories, run garbage collection
							to reclaim storage space:
						</p>

						<CopyCommand
							command="registry garbage-collect /path/to/config.yml"
							aria-label="Copy garbage collect command"
						/>
					</div>

					<div class="flex justify-end">
						<Button @click="untaggedDialogStore.closeDialog">
							CLOSE
						</Button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup lang="ts">
import { Button, CopyCommand } from "~/components/ui"
import { useUntaggedDialogStore } from "~/stores/useUntaggedDialogStore"

const untaggedDialogStore = useUntaggedDialogStore()
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
