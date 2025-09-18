import { autoAnimate } from "@formkit/auto-animate";
import { Link } from "@inertiajs/react";
import { SearchOff as SearchOffIcon } from "@mui/icons-material";
import {
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Checkbox,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	FormControlLabel,
	MenuItem,
	Select,
	Skeleton,
	Tooltip,
	Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import React, { Suspense } from "react";
import { useFilters } from "../contexts/FiltersContext";
import { useRegistry, useRegistryHelpers } from "../contexts/RegistryContext";

const LoadingSkeleton = () => (
	<Box
		sx={{
			display: "grid",
			gridTemplateColumns: {
				xs: "1fr",
				sm: "repeat(2, 1fr)",
				lg: "repeat(3, 1fr)",
			},
			gap: 2,
		}}
	>
		{Array.from({ length: 6 }).map((_, i) => (
			<Card key={i} variant="outlined" sx={{ height: 170 }}>
				<CardContent>
					<Skeleton variant="text" width="80%" height={24} />
					<Box sx={{ display: "flex", gap: 0.5, mt: 1, mb: 1 }}>
						<Skeleton variant="rectangular" width={60} height={18} />
						<Skeleton variant="rectangular" width={50} height={18} />
					</Box>
					<Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
						<Skeleton variant="text" width="40%" />
						<Skeleton variant="text" width="30%" />
					</Box>
				</CardContent>
			</Card>
		))}
	</Box>
);

// Helper function to build repository URL
const buildRepositoryUrl = (repo: any) => {
	const params = new URLSearchParams();
	params.set("name", repo.name);

	if (repo.namespace) {
		params.set("namespace", repo.namespace);
	}

	if (repo.source) {
		params.set("source", repo.source);
	}

	return `/r?${params.toString()}`;
};

const Explore: React.FC = () => {
	const { availableArchitectures, sources } = useRegistry();
	const {
		filteredRepositories,
		architectureFilter,
		showUntagged,
		selectedSources,
		updateArchitecture,
		updateShowUntagged,
		handleSourceChange,
	} = useFilters();
	const { getStatusChipColor, getStatusTooltip } = useRegistryHelpers();
	const [untaggedDialog, setUntaggedDialog] = React.useState({
		open: false,
		repositoryName: "",
	});

	const cardsGridRef = React.useRef<HTMLDivElement>(null);

	React.useEffect(() => {
		if (cardsGridRef.current) {
			autoAnimate(cardsGridRef.current, {
				duration: 250,
				easing: "ease-in-out",
			});
		}
	}, []);

	const handleArchitectureChange = (event: SelectChangeEvent) => {
		updateArchitecture(event.target.value);
	};

	const handleShowUntaggedChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		updateShowUntagged(event.target.checked);
	};

	return (
		<Box
			sx={{
				bgcolor: "background.default",
				height: "100vh",
				display: "flex",
				flexDirection: { xs: "column", md: "row" },
				overflow: "hidden",
			}}
		>
			{/* Sidebar */}
			<Box
				sx={{
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
				}}
			>
				<Typography
					variant="h6"
					gutterBottom
					sx={{ color: "text.primary", mb: 3 }}
				>
					Filter by
				</Typography>

				{/* Sources Filter */}
				<Suspense fallback={<Skeleton variant="rectangular" height={100} />}>
					<Box sx={{ mb: 3 }}>
						<Typography
							variant="h6"
							sx={{
								fontSize: "0.875rem",
								fontWeight: 600,
								mb: 1,
								color: "text.primary",
							}}
						>
							Sources
						</Typography>
						{Object.values(sources).map((source) => {
							const hasError =
								source.status && (source.status >= 400 || source.status === 0);

							return (
								<Box
									key={source.key}
									sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
								>
									<FormControlLabel
										control={
											<Checkbox
												checked={selectedSources.includes(source.host)}
												onChange={(e) =>
													handleSourceChange(source.host, e.target.checked)
												}
												size="small"
												sx={{
													color: "primary.main",
													"&.Mui-checked": { color: "primary.main" },
												}}
											/>
										}
										label={
											<Typography
												sx={{
													fontSize: "0.875rem",
													color: "text.primary",
													textDecoration: hasError ? "line-through" : "none",
													opacity: hasError ? 0.7 : 1,
												}}
											>
												{source.host}
											</Typography>
										}
										sx={{ flexGrow: 1, mr: 1 }}
									/>
									{source.status && source.status !== 200 && (
										<Tooltip title={getStatusTooltip(source.status)} arrow>
											<Chip
												label={source.status}
												size="small"
												color={getStatusChipColor(source.status)}
												sx={{
													height: 16,
													fontSize: "0.65rem",
													minWidth: 32,
													"& .MuiChip-label": { px: 0.5 },
												}}
											/>
										</Tooltip>
									)}
								</Box>
							);
						})}
					</Box>
				</Suspense>

				{/* Architecture Filter */}
				<Suspense fallback={<Skeleton variant="rectangular" height={40} />}>
					<Box sx={{ mb: 3 }}>
						<Typography
							variant="h6"
							sx={{
								fontSize: "0.875rem",
								fontWeight: 600,
								mb: 1,
								color: "text.primary",
							}}
						>
							Architectures
						</Typography>
						<FormControl fullWidth>
							<Select
								value={architectureFilter}
								onChange={handleArchitectureChange}
								size="small"
								sx={{
									fontSize: "0.875rem",
									"& .MuiOutlinedInput-notchedOutline": {
										borderColor: "divider",
									},
								}}
							>
								<MenuItem value="all" sx={{ fontSize: "0.875rem" }}>
									All Architectures
								</MenuItem>
								{availableArchitectures.map((arch) => (
									<MenuItem
										key={arch}
										value={arch}
										sx={{ fontSize: "0.875rem" }}
									>
										{arch}
									</MenuItem>
								))}
							</Select>
						</FormControl>
					</Box>
				</Suspense>

				{/* Show Untagged */}
				<Box sx={{ mb: 3 }}>
					<FormControlLabel
						control={
							<Checkbox
								checked={showUntagged}
								onChange={handleShowUntaggedChange}
								size="small"
								sx={{ "& .MuiSvgIcon-root": { fontSize: "1rem" } }}
							/>
						}
						label={
							<Typography
								variant="body2"
								sx={{
									fontSize: "0.875rem",
									fontWeight: 500,
									color: "text.primary",
								}}
							>
								Show untagged repositories
							</Typography>
						}
					/>
				</Box>
			</Box>

			{/* Main Content */}
			<Box
				sx={{
					flexGrow: 1,
					p: { xs: 2, md: 4 },
					overflowY: "auto",
					height: { xs: "calc(100vh - 200px)", md: "100%" },
				}}
			>
				<Suspense fallback={<LoadingSkeleton />}>
					<Box
						ref={cardsGridRef}
						sx={{
							display: "grid",
							gridTemplateColumns: {
								xs: "1fr",
								sm: "repeat(2, 1fr)",
								md: "repeat(2, 1fr)",
								lg: "repeat(3, 1fr)",
							},
							gap: 2,
						}}
					>
						{!filteredRepositories || filteredRepositories.length === 0 ? (
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
									sx={{ fontSize: 80, color: "text.disabled", mb: 2 }}
								/>
								<Typography variant="h5" color="text.secondary" gutterBottom>
									No repositories found
								</Typography>
								<Typography
									variant="body1"
									color="text.secondary"
									sx={{ maxWidth: 400 }}
								>
									Check if your registry sources are properly configured and try
									refreshing the page.
								</Typography>
							</Box>
						) : (
							filteredRepositories?.map((repo) => (
								<Card
									key={`${repo.source}:${repo.fullName}`}
									elevation={0}
									variant="outlined"
									sx={{
										height: { xs: "auto", sm: "190px", md: "170px" },
										minHeight: { xs: "140px" },
										display: "flex",
										flexDirection: "column",
										bgcolor: "transparent",
										borderColor: "divider",
										"&:hover": {
											borderColor: "primary.main",
											boxShadow: "0 0 0 1px #4584f7",
										},
										transition: "all 0.2s ease-in-out",
									}}
								>
									<CardActionArea
										component={Link}
										href={buildRepositoryUrl(repo)}
										sx={{
											textDecoration: "none",
											color: "inherit",
											flexGrow: 1,
											display: "flex",
											flexDirection: "column",
										}}
									>
										<CardContent
											sx={{
												p: 1.5,
												"&:last-child": { pb: 1.5 },
												flexGrow: 1,
												display: "flex",
												flexDirection: "column",
												justifyContent: "space-between",
												width: "100%",
											}}
										>
											<Box sx={{ mb: 1 }}>
												<Typography
													variant="h6"
													sx={{
														color: "text.primary",
														fontSize: "1rem",
														fontWeight: 600,
														lineHeight: 1.3,
													}}
												>
													{repo.namespace
														? `${repo.namespace}/${repo.name}`
														: repo.name}
												</Typography>
											</Box>

											<Box
												sx={{
													flexGrow: 1,
													display: "flex",
													flexDirection: "column",
													justifyContent: "flex-start",
													minHeight: { xs: "52px", sm: "48px", md: "44px" },
													maxHeight: { xs: "auto", sm: "48px", md: "44px" },
												}}
											>
												<Box
													sx={{
														display: "flex",
														gap: 0.5,
														flexWrap: "wrap",
														minHeight: { xs: "40px", sm: "40px" },
														maxHeight: { xs: "auto", sm: "40px" },
														overflow: "hidden",
														mb: 1,
														alignContent: "flex-start",
													}}
												>
													{repo.tag_count === 0 ? (
														<Chip
															label="untagged"
															size="small"
															variant="outlined"
															sx={{
																fontSize: "0.7rem",
																height: 18,
																borderColor: "warning.main",
																color: "warning.main",
																"& .MuiChip-label": { px: 0.5 },
															}}
														/>
													) : repo.architectures &&
														repo.architectures.length > 0 ? (
														<>
															{repo.architectures
																.slice(0, 8)
																.map((arch: string) => (
																	<Chip
																		key={arch}
																		label={arch}
																		size="small"
																		variant="outlined"
																		sx={{
																			fontSize: "0.7rem",
																			height: 18,
																			borderColor: "divider",
																			color: "text.secondary",
																			"& .MuiChip-label": { px: 0.5 },
																		}}
																	/>
																))}
															{repo.architectures.length > 8 && (
																<Chip
																	label={`+${repo.architectures.length - 8}`}
																	size="small"
																	variant="outlined"
																	sx={{
																		fontSize: "0.7rem",
																		height: 18,
																		borderColor: "primary.main",
																		color: "primary.main",
																		"& .MuiChip-label": { px: 0.5 },
																	}}
																/>
															)}
														</>
													) : (
														<Typography
															variant="body2"
															sx={{
																color: "text.disabled",
																fontSize: "0.75rem",
																fontStyle: "italic",
																alignSelf: "center",
															}}
														>
															No architecture info
														</Typography>
													)}
												</Box>
											</Box>

											<Box
												sx={{
													display: "flex",
													justifyContent: "space-between",
													alignItems: "center",
													color: "text.secondary",
													fontSize: "0.875rem",
													mt: "auto",
												}}
											>
												<Box
													sx={{
														display: "flex",
														alignItems: "center",
														gap: 0.5,
													}}
												>
													<Typography variant="body2" sx={{ fontWeight: 500 }}>
														Size
													</Typography>
													<Typography
														variant="body2"
														sx={{ fontSize: "0.8rem" }}
													>
														{repo.total_size_formatted || "Unknown"}
													</Typography>
												</Box>
												<Typography
													variant="body2"
													sx={{
														fontSize: "0.75rem",
														color: "text.disabled",
														fontStyle: "italic",
													}}
												>
													{repo.registry_host}
												</Typography>
											</Box>
										</CardContent>
									</CardActionArea>
								</Card>
							))
						)}
					</Box>
				</Suspense>
			</Box>

			{/* Untagged Dialog */}
			<Dialog
				open={untaggedDialog.open}
				onClose={() => setUntaggedDialog({ open: false, repositoryName: "" })}
				sx={{ bgcolor: "#11151a", color: "text.primary" }}
			>
				<DialogTitle>Untagged Repository</DialogTitle>
				<DialogContent>
					<DialogContentText>
						This repository <strong>{untaggedDialog.repositoryName}</strong> is
						not tagged and cannot be opened.
						<br />
						<br />
						If you want to remove it completely from the registry, run:
						<br />
						<code
							style={{
								backgroundColor: "rgba(255, 255, 255, 0.08)",
								padding: "4px 8px",
								borderRadius: "4px",
								fontFamily: "monospace",
								fontSize: "0.9em",
								display: "inline-block",
								marginTop: "8px",
								border: "1px solid rgba(255, 255, 255, 0.12)",
							}}
						>
							rm -rf /var/lib/registry/docker/registry/v2/repositories/
							{untaggedDialog.repositoryName}
						</code>
						<br />
						<br />
						The reason it exists is because the Docker registry doesn't
						automatically delete repositories even when they become untagged.
					</DialogContentText>
				</DialogContent>
				<DialogActions>
					<Button
						onClick={() =>
							setUntaggedDialog({ open: false, repositoryName: "" })
						}
						autoFocus
					>
						OK
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default Explore;
