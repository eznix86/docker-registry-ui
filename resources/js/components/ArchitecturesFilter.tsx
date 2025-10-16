// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { FormControl, type SelectChangeEvent } from "@mui/material";
import { memo, useCallback } from "react";
import { FilterItemTitle, MenuItem, Select } from "~/components/ui";
import { useFilterStore } from "~/stores/filterStore";

function ArchitecturesFilter() {
	const localArchitectures = useFilterStore(
		(state) => state.localArchitectures,
	);
	const selectedArchitectures = useFilterStore(
		(state) => state.selectedArchitectures,
	);
	const setArchitecture = useFilterStore((state) => state.setArchitecture);

	const handleChange = useCallback(
		(event: SelectChangeEvent<string>) => {
			const value = event.target.value;
			setArchitecture(value === "all" ? null : value);
		},
		[setArchitecture],
	);

	const selectedValue =
		selectedArchitectures.length === 1 ? selectedArchitectures[0] : "all";

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
					{localArchitectures.map((arch) => (
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
