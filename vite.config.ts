import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { ProxyOptions } from 'vite';

interface RegistryConfig {
	url: string;
	host: () => string
	basicAuth: () => string
	auth: string;
	key: string;
	isGitHub: boolean;
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
			const isGitHub = url.toLowerCase().includes('ghcr.io');
			configs.push({
				url,
				auth,
				key,
				isGitHub,
				host: function () {
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

	const proxies: ProxyOptions = {};

	if (config.isGitHub) {
		const decodedAuth = atob(config.auth.replace(/"/g, ""));
		const password = decodedAuth.includes(':') ? decodedAuth.split(':')[1] : decodedAuth;

		proxies[`${apiPath}/github`] = {
			target: 'https://api.github.com',
			changeOrigin: true,
			rewrite: (path: string) => path.replace(new RegExp(`^${apiPath}/github`), ""),
			configure: (proxy: { on: (arg0: string, arg1: any) => void; }) => {
				proxy.on("proxyReq", (proxyReq: { setHeader: (arg0: string, arg1: string) => void; }) => {
					proxyReq.setHeader("Host", "api.github.com");
					proxyReq.setHeader("Authorization", `Bearer ${password}`);
					proxyReq.setHeader("User-Agent", "container-registry-ui");
				});
			},
		};

		// Docker Registry v2 proxy for manifests and blobs - uses Bearer token (base64 of password)
		proxies[apiPath] = {
			target: config.url,
			changeOrigin: true,
			rewrite: (path: string) => path.replace(new RegExp(`^${apiPath}`), ""),
			configure: (proxy: { on: (arg0: string, arg1: any) => void; }) => {
				proxy.on("proxyReq", (proxyReq: { setHeader: (arg0: string, arg1: string) => void; }) => {
					proxyReq.setHeader("Host", config.host());
					proxyReq.setHeader("Authorization", `Bearer ${btoa(password)}`);
				});
				proxy.on("proxyRes", (proxyRes: { statusCode: number; headers: any; }) => {
					if (proxyRes.statusCode === 401 && proxyRes.headers['www-authenticate']) {
						delete proxyRes.headers['www-authenticate'];
					}
				});
			},
		};
	} else {
		proxies[apiPath] = {
			target: config.url,
			changeOrigin: true,
			rewrite: (path: string) => path.replace(new RegExp(`^${apiPath}`), ""),
			configure: (proxy: { on: (arg0: string, arg1: any) => void; }) => {
				proxy.on("proxyReq", (proxyReq: { setHeader: (arg0: string, arg1: string) => void; }) => {
					proxyReq.setHeader("Host", config.host());
					proxyReq.setHeader("Authorization", config.basicAuth());
				});
				proxy.on("proxyRes", (proxyRes: { statusCode: number; headers: any; }) => {
					if (proxyRes.statusCode === 401 && proxyRes.headers['www-authenticate']) {
						delete proxyRes.headers['www-authenticate'];
					}
				});
			},
		};
	}

	return proxies;
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
		const configProxies = createProxyConfig(config);
		return { ...acc, ...configProxies };
	}, {});

	const sourcesData = registryConfigs.reduce((acc, config) => {
		const sourceName = config.key === 'default' ? 'default' : config.key;
		const path = `/api/${sourceName}`;
		const sourceInfo: { path: string; host: string; username?: string } = {
			path: path,
			host: config.host()
		};

		// For GitHub registries, extract username from auth
		if (config.isGitHub && config.auth) {
			const decodedAuth = atob(config.auth.replace(/"/g, ""));
			const username = decodedAuth.includes(':') ? decodedAuth.split(':')[0] : 'unknown';
			sourceInfo.username = username;
		}

		acc[sourceName] = sourceInfo;
		return acc;
	}, {} as Record<string, { path: string; host: string; username?: string }>);

	return {
		plugins: [
			react({
				babel: {
					plugins: [
						['babel-plugin-react-compiler']
					]
				},
				include: /\.(ts|tsx)$/
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
			{
				name: 'github-blob-redirect-handler',
				configureServer(server) {
					// Cache for GitHub blob redirect URLs
					const redirectCache = new Map<string, { url: string; expires: number }>();

					server.middlewares.use(async (req, res, next) => {
						// Handle GitHub Container Registry blob requests
						if (req.url?.includes('/blobs/') && req.url?.includes('/api/')) {
							// Check if this is a GitHub registry request
							const githubConfig = registryConfigs.find(config => config.isGitHub);
							if (githubConfig) {
								const sourceName = githubConfig.key === 'default' ? 'default' : githubConfig.key;
								const apiPath = `/api/${sourceName}`;

								if (req.url.startsWith(apiPath)) {
									try {
										// Extract blob hash from URL for caching
										const blobMatch = req.url.match(/\/blobs\/(sha256:[a-f0-9]+)/);
										const blobHash = blobMatch ? blobMatch[1] : '';

										// Check cache first and handle If-None-Match header
										const clientETag = req.headers['if-none-match'];
										const cached = redirectCache.get(blobHash);

										if (cached && cached.expires > Date.now()) {
											// If client has the same ETag, return 304 Not Modified
											if (clientETag && clientETag === blobHash) {
												console.log('Blob not modified, returning 304:', blobHash);
												res.statusCode = 304;
												res.setHeader('Access-Control-Allow-Origin', '*');
												res.setHeader('ETag', blobHash);
												res.end();
												return;
											}

											console.log('Using cached GitHub blob URL:', cached.url);

											const redirectResponse = await fetch(cached.url);

											// Set response headers including ETag
											res.setHeader('Content-Type', redirectResponse.headers.get('content-type') || 'application/octet-stream');
											if (redirectResponse.headers.get('content-length')) {
												res.setHeader('Content-Length', redirectResponse.headers.get('content-length')!);
											}
											res.setHeader('Access-Control-Allow-Origin', '*');
											res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
											res.setHeader('Access-Control-Allow-Headers', '*');
											res.setHeader('ETag', blobHash);
											res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
											res.statusCode = redirectResponse.status;

											// Stream the response
											if (redirectResponse.body) {
												const reader = redirectResponse.body.getReader();
												while (true) {
													const { done, value } = await reader.read();
													if (done) break;
													res.write(Buffer.from(value));
												}
											}
											res.end();
											return;
										}

										const decodedAuth = atob(githubConfig.auth.replace(/"/g, ""));
										const password = decodedAuth.includes(':') ? decodedAuth.split(':')[1] : decodedAuth;

										const registryPath = req.url.replace(apiPath, '');
										const registryUrl = `${githubConfig.url}${registryPath}`;

										console.log('Handling GitHub blob request:', registryUrl);

										const response = await fetch(registryUrl, {
											headers: {
												'Host': githubConfig.host(),
												'Authorization': `Bearer ${btoa(password)}`,
											},
										});

										// If it's a redirect, follow it and cache the URL
										if (response.status === 307 && response.headers.get('location')) {
											const redirectUrl = response.headers.get('location')!;
											console.log('Following GitHub blob redirect:', redirectUrl);

											// Cache the redirect URL (GitHub blob URLs typically expire in ~1 hour)
											if (blobHash) {
												const expires = Date.now() + (50 * 60 * 1000); // 50 minutes
												redirectCache.set(blobHash, { url: redirectUrl, expires });
												console.log('Cached redirect URL for blob:', blobHash);
											}

											const redirectResponse = await fetch(redirectUrl);

											// Set response headers including ETag
											res.setHeader('Content-Type', redirectResponse.headers.get('content-type') || 'application/octet-stream');
											if (redirectResponse.headers.get('content-length')) {
												res.setHeader('Content-Length', redirectResponse.headers.get('content-length')!);
											}
											res.setHeader('Access-Control-Allow-Origin', '*');
											res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
											res.setHeader('Access-Control-Allow-Headers', '*');
											res.setHeader('ETag', blobHash);
											res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
											res.statusCode = redirectResponse.status;

											// Stream the response
											if (redirectResponse.body) {
												const reader = redirectResponse.body.getReader();
												while (true) {
													const { done, value } = await reader.read();
													if (done) break;
													res.write(Buffer.from(value));
												}
											}
											res.end();
											return; // Don't call next()
										} else {
											// Handle normal response
											res.setHeader('Content-Type', response.headers.get('content-type') || 'application/octet-stream');
											if (response.headers.get('content-length')) {
												res.setHeader('Content-Length', response.headers.get('content-length')!);
											}
											res.setHeader('Access-Control-Allow-Origin', '*');
											res.statusCode = response.status;

											if (response.body) {
												const reader = response.body.getReader();
												while (true) {
													const { done, value } = await reader.read();
													if (done) break;
													res.write(Buffer.from(value));
												}
											}
											res.end();
											return; // Don't call next()
										}
									} catch (error) {
										console.error('Error handling GitHub blob request:', error);
										res.statusCode = 500;
										res.end('Failed to handle GitHub blob request');
										return; // Don't call next()
									}
								}
							}
						}

						next(); // Continue to next middleware
					});
				},
			},
		],
		server: {
			proxy: proxies,
		},
	};
});
