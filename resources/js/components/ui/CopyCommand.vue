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
	<button
		v-ripple
		type="button"
		class="relative flex items-center px-3 py-2 text-sm text-foreground bg-card border border-outline rounded hover:opacity-80 transition-all duration-200 ease-in-out overflow-hidden group active:translate-y-0.5 w-full sm:w-auto min-h-8"
		:aria-label="ariaLabel"
		@click="copy(command)"
	>
		<span class="truncate text-xs md:text-sm font-mono text-foreground">{{ command }}</span>
		<span
			class="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-xs rounded transition-all duration-200 pointer-events-none whitespace-nowrap z-10"
			:class="copied
				? 'bg-success text-success-foreground opacity-100'
				: 'bg-primary text-primary-foreground opacity-0 group-hover:opacity-100'"
		>
			{{ copied ? 'Copied' : 'Copy' }}
		</span>
	</button>
</template>

<script setup lang="ts">
import { useClipboard } from "@vueuse/core"

interface CopyCommandProps {
	command: string
	ariaLabel?: string
}

withDefaults(defineProps<CopyCommandProps>(), {
	ariaLabel: "Copy command",
})

// Use VueUse clipboard with 2-second timeout
const { copy, copied } = useClipboard({ legacy: true })
</script>
