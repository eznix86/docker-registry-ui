export function parseRepositoryName(fullName: string): {
	name: string;
	namespace?: string;
} {
	if (fullName.includes("/")) {
		const [namespace, name] = fullName.split("/", 2);
		return { name, namespace };
	}
	return { name: fullName };
}

export function calculateRepositorySize(tags: Array<{ size: string }>): number {
	return tags.reduce((sum, tag) => {
		const sizeMatch = tag.size.match(/^([\d.]+)\s*(\w+)$/);
		if (sizeMatch) {
			const value = parseFloat(sizeMatch[1]);
			const unit = sizeMatch[2];
			const multipliers: { [key: string]: number } = {
				Bytes: 1,
				KB: 1024,
				MB: 1024 * 1024,
				GB: 1024 * 1024 * 1024,
				TB: 1024 * 1024 * 1024 * 1024,
			};
			return sum + value * (multipliers[unit] || 1);
		}
		return sum;
	}, 0);
}
