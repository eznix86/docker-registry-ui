// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, FormControl, styled, Typography } from "@mui/material";
import { memo } from "react";
import { MenuItem, Select } from "~/components/ui";
import { useRepositoryFilters } from "~/hooks/useRepositoryFilters";

const SortContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
	flexWrap: "wrap",
}));

const SortLabel = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	minWidth: "auto",
	[theme.breakpoints.up("sm")]: {
		minWidth: theme.custom.spacing.sortLabelMinWidth,
	},
}));

function RepositorySortBy() {
	const { filters, setSortBy } = useRepositoryFilters();

	return (
		<SortContainer>
			<SortLabel variant="body2">Sort by</SortLabel>
			<FormControl size="small" sx={{ minWidth: 120 }}>
				<Select
					value={filters.sortBy}
					onChange={(e) => setSortBy(e.target.value as typeof filters.sortBy)}
				>
					<MenuItem value="newest">Newest</MenuItem>
					<MenuItem value="oldest">Oldest</MenuItem>
					<MenuItem value="name">Name</MenuItem>
					<MenuItem value="size">Size</MenuItem>
				</Select>
			</FormControl>
		</SortContainer>
	);
}

export default memo(RepositorySortBy);
