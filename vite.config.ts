import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type {ProxyOptions} from 'vite';

interface RegistryConfig {
	url: string;
	host: () => string
	basicAuth: () => string
	auth: string;
	key: string;
}

function extractRegistryConfigs(env: Record<string, string>): RegistryConfig[] {
	const configs: RegistryConfig[] = [];
	const urlEntries = Object.entries(env).filter(([key]) => key.startsWith('REGISTRY_URL'));
	
	urlEntries.forEach(([urlKey, url]) => {
		const suffix = urlKey.replace('REGISTRY_URL', '');
		const key = suffix.startsWith('_') ? suffix.slice(1).toLowerCase() : 'default';
		const authKey = suffix ? `REGISTRY_AUTH${suffix}` : 'REGISTRY_AUTH';
		const auth = env[authKey];
		
		if (url && auth) {
			configs.push({ 
				url,
				auth,
				key,
				host: function() {
					return url.replace(
						/^https?:\/\//,
						"",
					).replace(/\/.*/, "");
				},
				basicAuth: function () {
					return `Basic ${auth.replace(/"/g, "")}`
				}
			});
		}
	});
	
	return configs;
}

function createProxyConfig(config: RegistryConfig): ProxyOptions {
	const sourceName = config.key === 'default' ? 'default' : config.key;
	const apiPath = `/api/${sourceName}`;
	
	return {
		[apiPath]: {
			target: config.url,
			changeOrigin: true,
			rewrite: (path: string) => path.replace(new RegExp(`^${apiPath}`), ""),
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			configure: (proxy: { on: (arg0: string, arg1: any) => void; }) => {
				proxy.on("proxyReq", (proxyReq: { setHeader: (arg0: string, arg1: string) => void; }) => {
					proxyReq.setHeader("Host", config.host());
					proxyReq.setHeader(
						"Authorization",
						config.basicAuth(),
					);
				});
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				proxy.on("proxyRes", (proxyRes: { statusCode: number; headers: any; }) => {
					// Remove WWW-Authenticate header on 401 responses to prevent browser auth popup
					if (proxyRes.statusCode === 401 && proxyRes.headers['www-authenticate']) {
						delete proxyRes.headers['www-authenticate'];
					}
				});
			},
		},
	};
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	// Load .env files for development
	const env = loadEnv(mode, process.cwd(), "");

	const registryConfigs = extractRegistryConfigs(env);
	
	if (registryConfigs.length === 0) {
		// During build process, environment variables might not be available
		// Return empty config to allow build to proceed
		console.warn('No registry configuration found - using empty config for build');
	}

	Object.entries(env).forEach(([key, value]) => {
		if (key.startsWith('REGISTRY_URL')) {
			console.log(`${key}=${value}`);
		}
	});

	const proxies = registryConfigs.reduce((acc, config) => {
		return { ...acc, ...createProxyConfig(config) };
	}, {});

	const sourcesData = registryConfigs.reduce((acc, config) => {
		const sourceName = config.key === 'default' ? 'default' : config.key;
		const path = `/api/${sourceName}`;
		acc[sourceName] = {
			path: path,
			host: config.host()
		};
		return acc;
	}, {} as Record<string, { path: string; host: string }>);

	return {
		plugins: [
			react({
				babel: {
					plugins: ['babel-plugin-react-compiler'],
				},
			}),
			{
				name: 'sources-endpoint',
				configureServer(server) {
					server.middlewares.use('/sources.json', (_req, res) => {
						res.setHeader('Content-Type', 'application/json');
						res.setHeader('Access-Control-Allow-Origin', '*');
						res.end(JSON.stringify(sourcesData));
					});
				},
			},
		],
		server: {
			proxy: proxies,
		},
	};
});
