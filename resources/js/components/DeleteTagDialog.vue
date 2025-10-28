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
	<Dialog v-model="tagDeleteStore.isOpen">
		<DialogTitle>Delete Tag</DialogTitle>

		<p class="text-foreground mb-6">
			Are you sure you want to delete the tag <strong>{{ tagDeleteStore.selectedTag?.name }}</strong>? This action cannot be undone.
		</p>

		<div class="flex justify-end gap-3">
			<Button variant="ghost" @click="tagDeleteStore.closeDialog">
				CANCEL
			</Button>
			<Button variant="destructive" @click="tagDeleteStore.confirmDelete">
				DELETE TAG
			</Button>
		</div>
	</Dialog>
</template>

<script setup lang="ts">
import {
	Button,
	Dialog,
	DialogTitle,
} from "~/components/ui"
import { useTagDeleteStore } from "~/stores/useTagDeleteStore"

const tagDeleteStore = useTagDeleteStore()
</script>
