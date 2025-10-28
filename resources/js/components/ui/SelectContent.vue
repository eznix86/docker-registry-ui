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
	<transition
		leave-active-class="transition duration-100 ease-out"
		leave-from-class="opacity-100"
		leave-to-class="opacity-0"
	>
		<ListboxOptions class="absolute z-[9999] mt-1 max-h-60 w-full overflow-auto rounded-lg bg-popover py-1 text-base shadow-lg border border-outline sm:text-sm focus:outline-hidden">
			<slot />
		</ListboxOptions>
	</transition>
</template>

<script setup lang="ts">
import { ListboxOptions } from "@headlessui/vue"
</script>
