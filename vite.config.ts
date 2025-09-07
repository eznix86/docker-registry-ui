import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// Load .env files for development
	const env = loadEnv(mode, process.cwd(), "");

	if (!env.REGISTRY_URL) {
		throw new Error("REGISTRY_URL environment variable is required");
	}

	if (!env.REGISTRY_AUTH) {
		throw new Error("REGISTRY_AUTH environment variable is required");
	}

	return {
		plugins: [react()],
		server: {
			proxy: {
				"/api": {
					target: env.REGISTRY_URL,
					changeOrigin: true,
					rewrite: (path) => path.replace(/^\/api/, ""),
					configure: (proxy) => {
						proxy.on("proxyReq", (proxyReq) => {
							const registryHost = env.REGISTRY_URL.replace(
								/^https?:\/\//,
								"",
							).replace(/\/.*/, "");
							proxyReq.setHeader("Host", registryHost);
							proxyReq.setHeader(
								"Authorization",
								`Basic ${env.REGISTRY_AUTH.replace(/"/g, "")}`,
							);
						});
					},
				},
			},
		},
	};
});
