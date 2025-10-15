// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Search as SearchIcon } from "@mui/icons-material";
import { InputAdornment } from "@mui/material";
import { memo, useCallback } from "react";
import { TextField } from "~/components/ui";
import { useRepositoryFilters } from "~/hooks/useRepositoryFilters";

function RepositorySearchFilter() {
	const { filters, setFilter } = useRepositoryFilters();

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setFilter(e.target.value);
		},
		[setFilter],
	);

	return (
		<TextField
			placeholder="Filter tags"
			value={filters.filter}
			onChange={handleChange}
			size="small"
			sx={{
				flexGrow: 1,
				maxWidth: { xs: "100%", sm: 300 },
			}}
			slotProps={{
				input: {
					startAdornment: (
						<InputAdornment position="start">
							<SearchIcon
								sx={(theme) => ({
									color: theme.palette.text.secondary,
									fontSize: theme.custom.typography.fontSizes.xl,
								})}
							/>
						</InputAdornment>
					),
				},
			}}
		/>
	);
}

export default memo(RepositorySearchFilter);
