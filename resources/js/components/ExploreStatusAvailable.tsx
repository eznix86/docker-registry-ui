// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Deferred, usePage } from "@inertiajs/react";
import { CircularProgress, styled, Typography } from "@mui/material";
import { memo } from "react";
import type { ExploreProps } from "~/types";

const ResultsText = styled(Typography)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
}));

function ExploreStatusAvailable() {
	const { repositories = [], totalRepositories = 0 } = usePage()
		.props as ExploreProps;
	return (
		<Deferred data="repositories" fallback={<CircularProgress size={16} />}>
			<ResultsText variant="body2" color="text.secondary">
				{repositories.length} of {totalRepositories} available results.
			</ResultsText>
		</Deferred>
	);
}
export default memo(ExploreStatusAvailable);
