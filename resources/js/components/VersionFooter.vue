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
	<footer class="fixed bottom-4 right-6 text-sm text-muted-foreground backdrop-blur-sm bg-muted/50 px-3 py-1.5 rounded-lg shadow-sm">
		<span class="text-muted-foreground">{{ currentVersion }}</span>
		<template v-if="latestVersion && latestVersion !== currentVersion">
			<span class="mx-1 text-muted-foreground">•</span>
			<a :href="updateUrl" class="text-primary hover:underline">
				{{ latestVersion }} available
			</a>
		</template>
	</footer>
</template>

<script setup lang="ts">
interface VersionFooterProps {
	currentVersion: string
	latestVersion?: string
	updateUrl?: string
}

withDefaults(defineProps<VersionFooterProps>(), {
	latestVersion: undefined,
	updateUrl: "#",
})
</script>
