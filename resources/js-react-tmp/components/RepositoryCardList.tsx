// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository } from "~/types"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { Deferred } from "@inertiajs/react"
import { SearchOff as SearchOffIcon } from "@mui/icons-material"
import { Box, CircularProgress, styled, Typography } from "@mui/material"
import { memo } from "react"
import RepositoryCard from "~/components/RepositoryCard"
import { useExploreStore } from "~/stores/exploreStore"

const GridContainer = styled(Box)(({ theme }) => ({
	display: "grid",
	gridTemplateColumns: "1fr",
	gap: theme.spacing(2),
	[theme.breakpoints.up("sm")]: {
		gridTemplateColumns: "repeat(2, 1fr)",
	},
	[theme.breakpoints.up("lg")]: {
		gridTemplateColumns: "repeat(3, 1fr)",
	},
}))

const EmptyStateContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: theme.custom.sizes.emptyState.height,
	textAlign: "center",
	gridColumn: "1 / -1",
}))

const EmptyStateIcon = styled(SearchOffIcon)(({ theme }) => ({
	fontSize: theme.custom.sizes.emptyState.iconSize,
	color: theme.palette.text.disabled,
	marginBottom: theme.spacing(2),
}))

const EmptyStateMessage = styled(Typography)({
	maxWidth: 400,
})

const EmptyState = memo(() => (
	<EmptyStateContainer>
		<EmptyStateIcon />
		<Typography variant="h5" color="text.secondary" gutterBottom>
			No repositories found
		</Typography>
		<EmptyStateMessage variant="body1" color="text.secondary">
			Try adjusting your search or filters, or check if your registry sources
			are properly configured.
		</EmptyStateMessage>
	</EmptyStateContainer>
))

EmptyState.displayName = "EmptyState"

// Helper function to generate unique repository keys
function getRepositoryKey(repo: Repository): string {
	const namespace = repo.namespace || ""
	return `${repo.registry}:${namespace}/${repo.name}`
}

function RepositoryCardList() {
	const repositories = useExploreStore(state => state.repositories)
	const [parent] = useAutoAnimate()

	return (
		<GridContainer ref={parent}>
			{repositories.length === 0
				? (
						<EmptyState />
					)
				: (
						<Deferred data="repositories" fallback={<CircularProgress size={16} />}>
							{repositories.map((repository: Repository) => (
								<RepositoryCard
									key={getRepositoryKey(repository)}
									repository={repository}
								/>
							))}
						</Deferred>
					)}
		</GridContainer>
	)
}

export default memo(RepositoryCardList)
