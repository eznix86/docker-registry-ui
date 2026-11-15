export function normalizeArray<T>(value: T[] | null | undefined): T[] {
	return Array.isArray(value) ? value : []
}
