// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { useEffect, useState } from "react"

interface Release {
	tag_name: string
	html_url: string
}

interface CachedRelease {
	data: Release
	timestamp: number
}

const CURRENT_VERSION = "0.5.1"
const REPO_OWNER = "eznix86"
const REPO_NAME = "docker-registry-ui"
const CACHE_KEY = "latest-release-cache"
const CACHE_DURATION = 1000 * 60 * 60 // 1 hour

function compareVersions(current: string, latest: string): boolean {
	const cleanCurrent = current.replace(/^v/, "")
	const cleanLatest = latest.replace(/^v/, "")

	const currentParts = cleanCurrent.split(".").map(Number)
	const latestParts = cleanLatest.split(".").map(Number)

	for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
		const currentPart = currentParts[i] || 0
		const latestPart = latestParts[i] || 0

		if (latestPart > currentPart)
			return true
		if (latestPart < currentPart)
			return false
	}

	return false
}

function getCachedRelease(): Release | null {
	try {
		const cached = localStorage.getItem(CACHE_KEY)
		if (!cached)
			return null

		const { data, timestamp }: CachedRelease = JSON.parse(cached)
		const isExpired = Date.now() - timestamp > CACHE_DURATION

		return isExpired ? null : data
	}
	catch {
		return null
	}
}

function setCachedRelease(release: Release): void {
	try {
		const cached: CachedRelease = {
			data: release,
			timestamp: Date.now(),
		}
		localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
	}
	catch (error) {
		console.error("Failed to cache release:", error)
	}
}

export function useVersion() {
	const [release, setRelease] = useState<Release | null>(() =>
		getCachedRelease(),
	)
	const [isLoading, setIsLoading] = useState(!getCachedRelease())

	useEffect(() => {
		if (release) {
			return
		}

		const fetchLatestRelease = async () => {
			try {
				const response = await fetch(
					`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/releases/latest`,
					{
						headers: {
							Accept: "application/vnd.github.v3+json",
						},
					},
				)
				if (response.ok) {
					const data = await response.json()
					setRelease(data)
					setCachedRelease(data)
				}
			}
			catch (error) {
				console.error("Failed to fetch latest release:", error)
			}
			finally {
				setIsLoading(false)
			}
		}

		fetchLatestRelease()
	}, [release])

	const hasNewVersion = release
		? compareVersions(CURRENT_VERSION, release.tag_name)
		: false

	return {
		currentVersion: CURRENT_VERSION,
		latestVersion: release?.tag_name,
		hasNewVersion,
		releaseUrl: release?.html_url,
		isLoading,
	}
}
