import type { Registry, SharedProps } from "~/types"
import { usePage } from "@inertiajs/vue3"

function useRegistriesList(): Registry[] {
	const page = usePage<SharedProps>()
	const registries = page.props.registries
	return (registries ?? []) as Registry[]
}

function useRegistriesMap(): Map<string, string> {
	const registries = useRegistriesList()
	const map = new Map<string, string>()
	for (const r of registries) {
		map.set(r.host, r.publicHost || r.host)
	}
	return map
}

export function displayHost(host: string): string {
	const map = useRegistriesMap()
	return map.get(host) ?? host
}
