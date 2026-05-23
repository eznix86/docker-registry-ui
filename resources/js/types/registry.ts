
export interface RegistryStatusInfo {
	code: number
	message: string
	description: string
}

export const REGISTRY_STATUS_MAP: Record<number, RegistryStatusInfo> = {
	// Pending/Unknown
	0: {
		code: 0,
		message: "Checking Status",
		description:
      "Connecting to registry. If this persists, the registry URL may be incorrect.",
	},

	// Docker Registry API V2 Client Errors (4xx - Your Configuration)
	401: {
		code: 401,
		message: "Unauthorized",
		description:
      "Authentication required or credentials are invalid. Check REGISTRY_AUTH in your configuration.",
	},
	403: {
		code: 403,
		message: "Forbidden",
		description:
      "Authenticated but insufficient permissions. The credentials lack read access to this registry or repository.",
	},
	404: {
		code: 404,
		message: "Not Found",
		description:
      "Registry API endpoint not found. Verify REGISTRY_URL points to a valid Registry API.",
	},
	429: {
		code: 429,
		message: "Rate Limited",
		description:
      "Registry rate limit exceeded. Reduce sync frequency or authenticate for higher limits.",
	},

	// Docker Registry API V2 Server Errors (5xx - Registry's Problem)
	500: {
		code: 500,
		message: "Internal Server Error",
		description:
      "Registry encountered an internal error. This is a server-side issue.",
	},
	502: {
		code: 502,
		message: "Bad Gateway",
		description:
      "Proxy or load balancer received invalid response from registry. Temporary infrastructure issue.",
	},
	503: {
		code: 503,
		message: "Registry Unavailable",
		description:
      "Registry is temporarily unavailable. Try again in a few minutes.",
	},
	504: {
		code: 504,
		message: "Gateway Timeout",
		description:
      "Proxy timed out waiting for registry response. Registry may be overloaded.",
	},

	// Cloudflare Errors (52x - Infrastructure Issue)
	520: {
		code: 520,
		message: "Web Server Error",
		description:
      "Cloudflare received invalid response from registry. Registry misconfiguration or crash.",
	},
	521: {
		code: 521,
		message: "Registry Down",
		description:
      "Cloudflare reports registry server is refusing connections or completely down.",
	},
	522: {
		code: 522,
		message: "Connection Timed Out",
		description:
      "Cloudflare timeout connecting to registry. Firewall blocking access or network issue.",
	},
	523: {
		code: 523,
		message: "Origin Unreachable",
		description:
      "Cloudflare cannot find registry server. DNS misconfiguration or routing issue.",
	},
	524: {
		code: 524,
		message: "Timeout",
		description:
      "Registry response exceeded Cloudflare timeout. Server overloaded or slow.",
	},
	525: {
		code: 525,
		message: "SSL Handshake Failed",
		description:
      "Cloudflare TLS/SSL negotiation with registry failed. Registry SSL misconfiguration.",
	},
	526: {
		code: 526,
		message: "Invalid SSL Certificate",
		description:
      "Cloudflare rejected registry SSL certificate. Certificate is invalid, expired, or untrusted.",
	},
}

export function getRegistryStatus(statusCode: number): RegistryStatusInfo {
	return (
		REGISTRY_STATUS_MAP[statusCode] || {
			code: statusCode,
			message: "Unknown Status",
			description: `Registry returned status code ${statusCode}.`,
		}
	)
}

export function isRegistryHealthy(statusCode: number): boolean {
	return statusCode >= 200 && statusCode < 300
}
