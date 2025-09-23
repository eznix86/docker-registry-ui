import {
	Build as BuildIcon,
	Lightbulb as LightbulbIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	LinearProgress,
	Typography,
} from "@mui/material";
import { useState } from "react";
import ArchitecturesFilter from "../components/ArchitecturesFilter";
import RepositoryCardList from "../components/RepositoryCardList";
import ShowUntaggedFilter from "../components/ShowUntaggedFilter";
import SourcesFilter from "../components/SourcesFilter";
import { FilterProvider, useFilter } from "../contexts/FilterContext";
import type { RepositoryMeta } from "../hooks/useRepositoryData";
import { useRepositories } from "../hooks/useRepositoryData";
import { useRepositoryStore, useShallow } from "../store/repositoryStore";

const sidebarSx = {
	width: { xs: "100%", md: 320 },
	minWidth: { xs: "100%", md: 320 },
	maxWidth: { xs: "100%", md: 320 },
	height: { xs: "auto", md: "100%" },
	maxHeight: { xs: "200px", md: "none" },
	flexShrink: 0,
	p: { xs: 2, md: 4 },
	borderRight: 0,
	borderBottom: { xs: 1, md: 0 },
	borderColor: "divider",
	bgcolor: "background.paper",
	overflowY: "auto",
};

const mainContentSx = {
	flexGrow: 1,
	p: { xs: 2, md: 4 },
	overflowY: "auto",
	height: { xs: "calc(100vh - 64px - 200px)", md: "100%" },
};

const containerSx = {
	bgcolor: "background.default",
	height: "calc(100vh - 64px)",
	display: "flex",
	flexDirection: { xs: "column", md: "row" },
	overflow: "hidden",
};

const filterTitleSx = {
	color: "text.primary",
	mb: 3,
};

function ExplorePageContent() {
	const { filteredRepos } = useFilter();

	const {
		isLoading: loading,
		error,
		refetch,
		loadingProgress,
	} = useRepositories();

	const [untaggedDialog, setUntaggedDialog] = useState({
		open: false,
		repositoryName: "",
		repositorySource: "",
	});

	const handleUntaggedRepositoryClick = (repo: RepositoryMeta) => {
		const fullName = repo.namespace
			? `${repo.namespace}/${repo.name}`
			: repo.name;
		setUntaggedDialog({
			open: true,
			repositoryName: fullName,
			repositorySource: repo.source || "",
		});
	};

	const handleCloseUntaggedDialog = () => {
		setUntaggedDialog({
			open: false,
			repositoryName: "",
			repositorySource: "",
		});
	};

	return (
		<Box sx={containerSx}>
			<Box sx={sidebarSx}>
				<Typography variant="h6" gutterBottom sx={filterTitleSx}>
					Filter by
				</Typography>

				<Box sx={{ mb: 3 }}>
					<SourcesFilter />
				</Box>

				<Box sx={{ mb: 3 }}>
					<ArchitecturesFilter />
				</Box>

				<Box sx={{ mb: 3 }}>
					<ShowUntaggedFilter />
				</Box>
			</Box>

			<Box sx={mainContentSx}>
				<Box
					sx={{
						mb: 3,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<Box
						sx={{
							display: "flex",
							gap: 2,
							flexDirection: "column",
							alignItems: "flex-start",
						}}
					>
						<Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
							<Typography variant="body2" color="text.secondary">
								{filteredRepos.length} of {filteredRepos.length} available
								results.
							</Typography>
							{loading && <CircularProgress size={16} />}
						</Box>
						{loading && loadingProgress && (
							<Box sx={{ width: "100%", maxWidth: 400, mt: 2 }}>
								<LinearProgress
									variant="determinate"
									value={loadingProgress.progress}
									sx={{
										mb: 1,
										width: "100%",
										minWidth: "300px",
									}}
								/>
								<Typography
									variant="body2"
									color="text.secondary"
									sx={{
										fontSize: "0.75rem",
										whiteSpace: "nowrap",
										overflow: "hidden",
										textOverflow: "ellipsis",
										width: "100%",
									}}
								>
									{loadingProgress.message}
								</Typography>
							</Box>
						)}
					</Box>
				</Box>

				{error && (
					<Alert severity="error" sx={{ mb: 3 }} onClose={() => refetch()}>
						{error.message || "Failed to load repositories"}
					</Alert>
				)}

				<RepositoryCardList
					repositories={filteredRepos}
					onUntaggedClick={handleUntaggedRepositoryClick}
				/>
			</Box>

			<Dialog
				open={untaggedDialog.open}
				onClose={handleCloseUntaggedDialog}
				maxWidth="md"
				fullWidth
				PaperProps={{
					sx: {
						background: "linear-gradient(135deg, #1a1e23 0%, #0d1117 100%)",
						border: "1px solid #30363d",
						borderRadius: "12px",
						boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
					},
				}}
			>
				<DialogTitle
					sx={{
						color: "text.primary",
						fontWeight: "bold",
						fontSize: "1.25rem",
						textAlign: "center",
						py: 3,
						borderBottom: "1px solid",
						borderColor: "divider",
					}}
				>
					Untagged Repository
				</DialogTitle>
				<DialogContent sx={{ py: 4, px: 4 }}>
					<Box sx={{ textAlign: "center", mb: 3, mt: 2 }}>
						<Typography
							variant="h6"
							sx={{
								color: "#f85149",
								fontWeight: "bold",
								mb: 1,
								mt: 3,
							}}
						>
							{untaggedDialog.repositoryName}
						</Typography>
						<Typography sx={{ color: "text.secondary", fontSize: "0.95rem" }}>
							This repository exists but has no tags and cannot be accessed
						</Typography>
					</Box>

					<Box
						sx={{
							bgcolor: "rgba(248, 81, 73, 0.1)",
							border: "1px solid rgba(248, 81, 73, 0.3)",
							borderRadius: "8px",
							p: 3,
							mb: 3,
						}}
					>
						<Typography
							sx={{
								color: "#ffa657",
								fontWeight: "bold",
								fontSize: "0.9rem",
								mb: 2,
								display: "flex",
								alignItems: "center",
								gap: 1,
							}}
						>
							<BuildIcon sx={{ fontSize: "1.1rem" }} />
							Manual Cleanup Required
						</Typography>
						<Typography
							sx={{
								color: "text.secondary",
								fontSize: "0.85rem",
								lineHeight: 1.6,
								mb: 2,
							}}
						>
							Docker registries don't automatically remove untagged
							repositories. To free up storage space, you'll need to manually
							delete it from the filesystem:
						</Typography>

						<Box
							sx={{
								background: "linear-gradient(135deg, #161b22 0%, #0d1117 100%)",
								border: "1px solid #30363d",
								borderRadius: "6px",
								p: 2,
								position: "relative",
								"&::before": {
									content: '"$"',
									position: "absolute",
									left: "12px",
									top: "50%",
									transform: "translateY(-50%)",
									color: "#7d8590",
									fontFamily: "monospace",
									fontSize: "0.9rem",
								},
							}}
						>
							<Typography
								sx={{
									fontFamily: "monospace",
									fontSize: "0.8rem",
									color: "#f0f6fc",
									pl: 2,
									wordBreak: "break-all",
									lineHeight: 1.4,
								}}
							>
								rm -rf /var/lib/registry/docker/registry/v2/repositories/
								{untaggedDialog.repositoryName}
							</Typography>
						</Box>
					</Box>

					<Box
						sx={{
							background:
								"linear-gradient(135deg, rgba(56, 139, 253, 0.15) 0%, rgba(56, 139, 253, 0.05) 100%)",
							border: "1px solid rgba(56, 139, 253, 0.3)",
							borderRadius: "8px",
							p: 3,
						}}
					>
						<Typography
							sx={{
								color: "#58a6ff",
								fontWeight: "bold",
								fontSize: "0.9rem",
								mb: 1,
								display: "flex",
								alignItems: "center",
								gap: 1,
							}}
						>
							<LightbulbIcon sx={{ fontSize: "1.1rem" }} />
							Pro Tip
						</Typography>
						<Typography
							sx={{
								color: "text.secondary",
								fontSize: "0.85rem",
								lineHeight: 1.6,
							}}
						>
							Consider running registry garbage collection after removing
							untagged repositories:
							<br />
							<code
								style={{
									color: "#58a6ff",
									fontSize: "0.8rem",
									fontFamily: "monospace",
								}}
							>
								registry garbage-collect /path/to/config.yml
							</code>
						</Typography>
					</Box>
				</DialogContent>
				<DialogActions
					sx={{
						p: 3,
						borderTop: "1px solid #30363d",
						background: "rgba(13, 17, 23, 0.6)",
					}}
				>
					<Button
						onClick={handleCloseUntaggedDialog}
						variant="contained"
						autoFocus
					>
						Close
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

function ExplorePage() {
	const { sources } = useRepositoryStore(
		useShallow((state) => ({
			sources: state.sources,
		})),
	);

	const { data: repositoryMetas = [] } = useRepositories();

	return (
		<FilterProvider repositoryMetas={repositoryMetas} sources={sources}>
			<ExplorePageContent />
		</FilterProvider>
	);
}

export default ExplorePage;
