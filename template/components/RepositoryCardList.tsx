import { SearchOff as SearchOffIcon } from "@mui/icons-material";
import { Box, Typography, styled } from "@mui/material";
import { memo, useCallback } from "react";
import RepositoryCard, { type RepositoryMeta } from "./RepositoryCard";

interface RepositoryCardListProps {
	repositories: RepositoryMeta[];
	onUntaggedClick?: (repo: RepositoryMeta) => void;
	sourceHost?: string;
}

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
}));

const EmptyStateContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	height: theme.custom.sizes.emptyState.height,
	textAlign: "center",
	gridColumn: "1 / -1",
}));

const EmptyStateIcon = styled(SearchOffIcon)(({ theme }) => ({
	fontSize: theme.custom.sizes.emptyState.iconSize,
	color: theme.palette.text.disabled,
	marginBottom: theme.spacing(2),
}));

const EmptyStateMessage = styled(Typography)({
	maxWidth: 400,
});

// Extract EmptyState as a separate memoized component
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
));

EmptyState.displayName = "EmptyState";

// Helper function to generate unique repository keys
const getRepositoryKey = (repo: RepositoryMeta): string => {
	const source = repo.source || "default";
	const namespace = repo.namespace || "";
	return `${source}:${namespace}/${repo.name}`;
};

function RepositoryCardList({
	repositories,
	onUntaggedClick,
	sourceHost,
}: RepositoryCardListProps) {
	// Memoize the click handler to prevent unnecessary re-renders
	const handleUntaggedClick = useCallback(
		(repo: RepositoryMeta) => {
			onUntaggedClick?.(repo);
		},
		[onUntaggedClick]
	);

	const isEmpty = repositories.length === 0;

	return (
		<GridContainer>
			{isEmpty ? (
				<EmptyState />
			) : (
				repositories.map((repo) => (
					<RepositoryCard
						key={getRepositoryKey(repo)}
						repository={repo}
						onUntaggedClick={handleUntaggedClick}
						sourceHost={sourceHost}
					/>
				))
			)}
		</GridContainer>
	);
}

export default memo(RepositoryCardList);
