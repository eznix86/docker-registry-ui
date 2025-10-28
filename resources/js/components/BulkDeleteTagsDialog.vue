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
	<Dialog v-model="bulkDeleteStore.isOpen">
		<DialogTitle>Select Tags to Delete</DialogTitle>

		<p class="text-muted-foreground mb-4">
			Select the tags you want to delete. This action cannot be undone.
		</p>

		<!-- Select All Checkbox -->
		<div class="mb-4 pb-4 border-b border-outline">
			<Checkbox
				id="select-all-tags"
				v-model="bulkDeleteStore.selectAll"
				:label="`Select All (${tags.length} tags)`"
				label-variant="default"
			/>
		</div>

		<!-- Tags List with Checkboxes -->
		<div class="max-h-96 overflow-y-auto space-y-2 mb-6">
			<div
				v-for="tag in tags"
				:key="tag.name"
				class="border border-outline rounded-lg p-3 hover:bg-muted/50 transition-colors"
			>
				<Checkbox
					:id="`tag-${tag.name}`"
					v-model="bulkDeleteStore.selectedTags"
					:value="tag.name"
					label-variant="default"
				>
					<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
						<span class="font-medium text-foreground">{{ tag.name }}</span>
						<span class="text-sm text-muted-foreground">
							{{ tag.images.length }} image{{ tag.images.length !== 1 ? 's' : '' }} • {{ calculateTagSize(tag) }}
						</span>
					</div>
				</Checkbox>
			</div>
		</div>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" @click="bulkDeleteStore.closeDialog">
				CANCEL
			</Button>
			<Button
				variant="destructive"
				:disabled="bulkDeleteStore.selectedTags.length === 0"
				@click="bulkDeleteStore.confirmDelete"
			>
				DELETE
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import type { Tag } from "~/types"
import {
	Button,
	Checkbox,
	Dialog,
	DialogTitle,
} from "~/components/ui"
import { formatBytes } from "~/lib/utils"
import { useTagBulkDeleteStore } from "~/stores/useTagBulkDeleteStore"

interface BulkDeleteTagsDialogProps {
	tags: Tag[]
}

defineProps<BulkDeleteTagsDialogProps>()

const bulkDeleteStore = useTagBulkDeleteStore()

function calculateTagSize(tag: Tag): string {
	const totalSize = tag.images.reduce((sum, img) => sum + img.size, 0)
	return formatBytes(totalSize)
}
</script>
