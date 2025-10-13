// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { FormControl } from "@mui/material";
import { memo, useCallback } from "react";
import { FilterTitle, MenuItem, Select } from "~/components/ui";

interface ArchitecturesFilterProps {
	architectures?: string[];
	selected?: string;
	onSelect?: (architecture: string) => void;
}

function ArchitecturesFilter({
	architectures = ["amd64", "arm64", "arm/v7", "386"],
	selected = "all",
	onSelect,
}: ArchitecturesFilterProps) {
	const handleChange = useCallback(
		(event: any) => {
			onSelect?.(event.target.value);
		},
		[onSelect],
	);

	return (
		<>
			<FilterTitle variant="h6">Architectures</FilterTitle>
			<FormControl size="small" fullWidth>
				<Select value={selected} displayEmpty onChange={handleChange}>
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
