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
	<div class="min-h-screen bg-background text-foreground flex items-center justify-center">
		<div class="text-center">
			<h1 class="text-6xl font-bold text-primary mb-4">
				404
			</h1>
			<h2 class="text-2xl font-semibold mb-2">
				Page Not Found
			</h2>
			<p class="text-muted-foreground mb-6">
				The page you're looking for doesn't exist.
			</p>
			<a
				href="/"
				class="inline-block px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
			>
				Go to Home
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
// 404 page
</script>
