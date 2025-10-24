// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { autoAnimatePlugin } from "@formkit/auto-animate/vue"
import { createPinia } from "pinia"
import { createApp } from "vue"
import App from "./App.vue"
import { vRipple } from "./directives/ripple"
import router from "./router"
import "./style.css"

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(autoAnimatePlugin)
app.directive("ripple", vRipple)
app.mount("#app")
