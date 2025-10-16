// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository } from "~/types";

export const random = (min: number, max: number) =>
	Math.floor(Math.random() * (max - min)) + min;

export const range = (start: number, end: number = start, step = 1) => {
	const output = [];

	if (start === end) {
		start = 0;
	}

	for (let i = start; i < end; i += step) {
		output.push(i);
	}

	return output;
};

export function formatBytes(bytes: number) {
	const units = ["Bytes", "KB", "MB", "GB", "TB"];
	if (bytes === 0) return "0 Bytes";
	const i = Math.floor(Math.log(bytes) / Math.log(1024));
	const value = bytes / 1024 ** i;
	return `${value.toFixed(2)} ${units[i]}`;
}

export const getDisplayName = (repo: Repository) => {
	return repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name;
};

export const getRelativeTime = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return "just now";
	if (diffInSeconds < 3600)
		return `${Math.floor(diffInSeconds / 60)} minutes ago`;
	if (diffInSeconds < 86400)
		return `${Math.floor(diffInSeconds / 3600)} hours ago`;
	if (diffInSeconds < 604800)
		return `${Math.floor(diffInSeconds / 86400)} days ago`;
	if (diffInSeconds < 2592000)
		return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
	if (diffInSeconds < 31536000)
		return `${Math.floor(diffInSeconds / 2592000)} months ago`;
	return `about ${Math.floor(diffInSeconds / 31536000)} years ago`;
};

export const pullCommand = (repo: Repository, tag: string) => {
	return `docker pull ${repo.registry}/${getDisplayName(repo)}:${tag}`;
};

/**
 * Debounce function that delays the execution of a function until after a specified delay
 * @param fn - The function to debounce
 * @param delay - The delay in milliseconds (default: 250ms)
 * @returns A debounced version of the function
 */
export function debounce<T extends (...args: never[]) => void>(
	fn: T,
	delay = 250,
): (...args: Parameters<T>) => void {
	let timeoutId: ReturnType<typeof setTimeout> | null = null;
	return (...args: Parameters<T>) => {
		if (timeoutId) clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), delay);
	};
}
