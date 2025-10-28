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
	<component :is="as" :class="card({ variant, class: props.class })" v-bind="$attrs">
		<slot />
	</component>
</template>

<script setup lang="ts">
import { tv } from "~/lib/utils"

defineOptions({
	inheritAttrs: false,
})

const props = withDefaults(defineProps<CardProps>(), {
	as: "div",
	variant: "default",
	class: "",
})

interface CardProps {
	as?: string
	variant?: "default" | "interactive"
	class?: string
}

const card = tv({
	base: "flex flex-col border border-outline rounded-lg shadow-[0_1px_3px_0_rgba(0,0,0,0.05)]",
	variants: {
		variant: {
			default: "bg-card",
			interactive:
				"bg-transparent hover:bg-card hover:border-primary hover:outline-2 hover:outline-primary hover:shadow-[0_0_0_1px_var(--accent)] hover:opacity-95 transition-[background-color,opacity,border-color,box-shadow,outline] duration-200 cursor-pointer",
		},
	},
	defaultVariants: {
		variant: "default",
	},
})
</script>
