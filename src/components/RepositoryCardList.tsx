import { useAutoAnimate } from "@formkit/auto-animate/react";
import { SearchOff as SearchOffIcon } from "@mui/icons-material";
import { Box, Typography } from "@mui/material";
import { memo } from "react";
import type { RepositoryMeta } from "../hooks/useRepositoryData";
import RepositoryCard from "./RepositoryCard";

interface RepositoryCardListProps {
	repositories: RepositoryMeta[];
	onUntaggedClick: (repo: RepositoryMeta) => void;
}

const gridSx = {
	display: "grid",
	gridTemplateColumns: {
		xs: "1fr",
		sm: "repeat(2, 1fr)",
		md: "repeat(2, 1fr)",
		lg: "repeat(3, 1fr)",
	},
	gap: 2
};

const EmptyState = () => (
	<Box
		sx={{
			display: "flex",
			flexDirection: "column",
			alignItems: "center",
			justifyContent: "center",
			height: "400px",
			textAlign: "center",
			gridColumn: "1 / -1",
		}}
	>
		<SearchOffIcon
			sx={{
				fontSize: 80,
				color: "text.disabled",
				mb: 2,
			}}
		/>
		<Typography variant="h5" color="text.secondary" gutterBottom>
			No repositories found
		</Typography>
		<Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400 }}>
			Try adjusting your search or filters, or check if your registry sources
			are properly configured.
		</Typography>
	</Box>
);

const RepositoryCardList = memo(function RepositoryCardList({
	repositories,
	onUntaggedClick,
}: RepositoryCardListProps) {
	const [animationRef] = useAutoAnimate({
		duration: 300,
		easing: "ease-in-out",
	});

	return (
		<Box ref={animationRef} sx={gridSx}>
			{repositories.length === 0 ? (
				<EmptyState />
			) : (
				repositories.map((repo) => (
					<RepositoryCard
						key={`${repo.source || "default"}:${repo.namespace || ""}/${repo.name}`}
						repository={repo}
						onUntaggedClick={onUntaggedClick}
					/>
				))
			)}
		</Box>
	);
});

export default RepositoryCardList;
