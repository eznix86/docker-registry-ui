// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { createRouter, createWebHistory } from "vue-router"
import Home from "../views/Home.vue"
import RepositoryDetail from "../views/RepositoryDetail.vue"

const router = createRouter({
	history: createWebHistory(import.meta.env.BASE_URL),
	routes: [
		{
			path: "/",
			name: "home",
			component: Home,
		},
		{
			path: "/r/:registry/:owner/:repo",
			name: "repository-detail",
			component: RepositoryDetail,
		},
		{
			path: "/r",
			name: "repository-simple",
			component: RepositoryDetail,
		},
	],
})

export default router
