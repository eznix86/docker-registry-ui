/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

/**
 * Get relative time string from date
 */
export function getRelativeTimeString(dateString: string): string {
	const now = new Date();
	const date = new Date(dateString);
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return "just now";
	} else if (diffInSeconds < 3600) {
		const minutes = Math.floor(diffInSeconds / 60);
		return `about ${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
	} else if (diffInSeconds < 86400) {
		const hours = Math.floor(diffInSeconds / 3600);
		return `about ${hours} hour${hours !== 1 ? "s" : ""} ago`;
	} else if (diffInSeconds < 2592000) {
		const days = Math.floor(diffInSeconds / 86400);
		return `about ${days} day${days !== 1 ? "s" : ""} ago`;
	} else if (diffInSeconds < 31536000) {
		const months = Math.floor(diffInSeconds / 2592000);
		return `about ${months} month${months !== 1 ? "s" : ""} ago`;
	} else {
		const years = Math.floor(diffInSeconds / 31536000);
		return `about ${years} year${years !== 1 ? "s" : ""} ago`;
	}
}
