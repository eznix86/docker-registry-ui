// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { usePage } from "@inertiajs/react";
import { FormControl, type SelectChangeEvent } from "@mui/material";
import { memo, useCallback } from "react";
import { FilterItemTitle, MenuItem, Select } from "~/components/ui";
import { useExploreFilters } from "~/hooks/useExploreFilters";
import type { ExploreProps } from "~/types";

function ArchitecturesFilter() {
	const { architectures = [] } = usePage().props as ExploreProps;
	const { filters, setArchitecture } = useExploreFilters();

	const handleChange = useCallback(
		(event: SelectChangeEvent<string>) => {
			const value = event.target.value;
			setArchitecture(value === "all" ? null : value);
		},
		[setArchitecture],
	);

	const selectedValue =
		filters.architectures.length === 1 ? filters.architectures[0] : "all";

	return (
		<>
			<FilterItemTitle variant="h6">Architectures</FilterItemTitle>
			<FormControl size="small" fullWidth>
				<Select
					value={selectedValue}
					displayEmpty
					onChange={handleChange as (event: unknown) => void}
				>
					<MenuItem value="all">All Architectures</MenuItem>
					{architectures.map((arch) => (
						<MenuItem key={arch} value={arch}>
							{arch}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</>
	);
}

export default memo(ArchitecturesFilter);
