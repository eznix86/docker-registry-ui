// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Deferred } from "@inertiajs/react"
import { CircularProgress, styled, Typography } from "@mui/material"
import { memo } from "react"
import { useExploreStore } from "~/stores/exploreStore"

const ResultsText = styled(Typography)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
}))

function ExploreStatusAvailable() {
	const repositories = useExploreStore(state => state.repositories)
	const totalRepositories = useExploreStore(state => state.totalRepositories)

	return (
		<Deferred data="repositories" fallback={<CircularProgress size={16} />}>
			<ResultsText variant="body2" color="text.secondary">
				{repositories.length}
				{" "}
				of
				{totalRepositories}
				{" "}
				available results.
			</ResultsText>
		</Deferred>
	)
}
export default memo(ExploreStatusAvailable)
