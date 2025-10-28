// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2025  Bruno Bernard
//
// This file is part of Docker Registry UI (Container Hub).
//
// Docker Registry UI is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your option) any later version.
//
// Docker Registry UI is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

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
		message: "No Credentials",
		description:
			"Registry requires authentication. Add username and password in configuration.",
	},
	403: {
		code: 403,
		message: "Wrong Credentials",
		description:
			"Username/password is incorrect, or account lacks permission. Verify your credentials.",
	},
	404: {
		code: 404,
		message: "Wrong URL",
		description:
			"Registry not found at this URL. Check the registry address (e.g., registry-1.docker.io).",
	},
	429: {
		code: 429,
		message: "Rate Limited",
		description:
			"Too many requests to registry. Wait 1-5 minutes before trying again.",
	},

	// Docker Registry API V2 Server Errors (5xx - Registry's Problem)
	500: {
		code: 500,
		message: "Registry Error",
		description:
			"Registry software error. Nothing you can do - contact the registry administrator.",
	},
	502: {
		code: 502,
		message: "Proxy Error",
		description:
			"Reverse proxy/load balancer issue. Contact registry administrator.",
	},
	503: {
		code: 503,
		message: "Registry Offline",
		description:
			"Registry is down for maintenance or overloaded. Wait and try again later.",
	},
	504: {
		code: 504,
		message: "Gateway Timeout",
		description:
			"Proxy timeout waiting for registry. Registry is overloaded - try again later.",
	},

	// Cloudflare/CDN Errors (52x - Infrastructure Issue)
	520: {
		code: 520,
		message: "CDN Error",
		description:
			"CloudFlare/CDN received invalid response. Registry misconfiguration - contact admin.",
	},
	521: {
		code: 521,
		message: "Registry Offline",
		description: "Registry server is completely down. Contact administrator.",
	},
	522: {
		code: 522,
		message: "Connection Failed",
		description:
			"Cannot reach registry through CDN. Firewall or network issue - contact admin.",
	},
	523: {
		code: 523,
		message: "Cannot Reach Server",
		description:
			"CDN cannot find registry server. DNS or routing issue - contact admin.",
	},
	524: {
		code: 524,
		message: "Timeout",
		description:
			"Registry took too long to respond. Server overloaded - try again later.",
	},
	525: {
		code: 525,
		message: "SSL Handshake Failed",
		description:
			"TLS/SSL negotiation failed. Registry SSL misconfiguration - contact admin.",
	},
	526: {
		code: 526,
		message: "Invalid Certificate",
		description:
			"SSL certificate expired or invalid. Registry admin must renew certificate.",
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
