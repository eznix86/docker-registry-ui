import { encodeRouteSegment } from "~/lib/routes"

export function buildFilterParams(
	filters: Record<string, string | string[] | boolean | number | null | undefined>,
): URLSearchParams {
	const params = new URLSearchParams()

	for (const [key, value] of Object.entries(filters)) {
		if (value === null || value === undefined || value === false || value === "") {
			continue
		}

		if (Array.isArray(value)) {
			// Add each array item as separate parameter
			value.forEach((v) => {
				const encodedValue = encodeRouteSegment(String(v))
				params.append(key, encodedValue)
			})
		}
		else if (typeof value === "boolean") {
			params.append(key, "true")
		}
		else {
			const encodedValue = encodeRouteSegment(String(value))
			params.append(key, encodedValue)
		}
	}

	return params
}
