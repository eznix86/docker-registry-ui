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
	<ListboxOption
		v-slot="{ active, selected }"
		:value="value"
		as="template"
	>
		<li
			class="relative cursor-default py-2 pr-9 pl-3 select-none outline-hidden transition-colors"
			:class="{
				'bg-primary text-primary-foreground': active || selected,
				'text-popover-foreground': !active && !selected,
			}"
		>
			<span class="block truncate">
				<slot>{{ label }}</slot>
			</span>
		</li>
	</ListboxOption>
</template>

<script setup lang="ts">
import { ListboxOption } from "@headlessui/vue"

interface SelectItemProps {
	value: string
	label?: string
}

defineProps<SelectItemProps>()
</script>
