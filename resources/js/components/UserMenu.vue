<template>
	<Menu v-if="user" as="div" class="relative">
		<MenuButton
			v-ripple
			class="w-10 h-10 p-2 hover:bg-primary-foreground/10 rounded-full transition-colors inline-flex items-center justify-center text-primary-foreground"
			aria-label="User menu"
			title="User menu"
		>
			<svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
				<path d="M480-160q-33 0-56.5-23.5T400-240q0-33 23.5-56.5T480-320q33 0 56.5 23.5T560-240q0 33-23.5 56.5T480-160Zm0-240q-33 0-56.5-23.5T400-480q0-33 23.5-56.5T480-560q33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Zm0-240q-33 0-56.5-23.5T400-720q0-33 23.5-56.5T480-800q33 0 56.5 23.5T560-720q0 33-23.5 56.5T480-640Z" />
			</svg>
		</MenuButton>

		<transition
			leave-active-class="transition duration-100 ease-out"
			leave-from-class="opacity-100"
			leave-to-class="opacity-0"
		>
			<MenuItems class="absolute right-0 z-[9999] mt-1 w-56 rounded-lg bg-popover border border-outline shadow-lg focus:outline-none">
				<div class="px-3 py-2 border-b border-outline">
					<p class="text-sm font-medium text-popover-foreground truncate">
						{{ user.name || user.email }}
					</p>
					<p class="text-xs text-muted-foreground truncate">
						{{ user.email }}
					</p>
				</div>

				<div class="p-1">
					<MenuItem v-slot="{ active }">
						<form method="POST" action="/oauth/logout">
							<button
								type="submit"
								class="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md outline-none transition-colors"
								:class="active ? 'bg-primary text-primary-foreground' : 'text-popover-foreground'"
							>
								<svg class="w-4 h-4 shrink-0" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor">
									<path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z" />
								</svg>
								Logout
							</button>
						</form>
					</MenuItem>
				</div>
			</MenuItems>
		</transition>
	</Menu>
</template>

<script setup lang="ts">
import type { AuthUser, SharedProps } from "~/types"
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/vue"
import { usePage } from "@inertiajs/vue3"
import { computed } from "vue"

const page = usePage<SharedProps>()
const user = computed<AuthUser | undefined>(() => page.props.auth?.user)
</script>
