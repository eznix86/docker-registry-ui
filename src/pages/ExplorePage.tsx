import { autoAnimate } from "@formkit/auto-animate";
import {
	Alert,
	Box,
	Button,
	Card,
	CardActionArea,
	CardContent,
	Checkbox,
	Chip,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogContentText,
	DialogTitle,
	FormControl,
	FormControlLabel,
	LinearProgress,
	MenuItem,
	Select,
	Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import React, {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
	type RepositoryMeta,
	useRepositoryStore,
} from "../store/repositoryStore";

function ExplorePage() {
	const dialogTitleId = useId();
	const dialogDescriptionId = useId();
	const [searchParams, setSearchParams] = useSearchParams();
	const {
		repositoryMetas,
		loading,
		loadingStage,
		error,
		availableArchitectures,
		sources,
		fetchRepositoryMetas,
		startPeriodicRefresh,
		stopPeriodicRefresh,
		clearError,
		hydrated,
	} = useRepositoryStore();

	const searchQuery = searchParams.get("search");
	const archQuery = searchParams.get("arch") || "all";
	const showUntaggedQuery = searchParams.get("showUntagged") || "false";
	const sourcesQuery = searchParams.get("sources") || "";
	const [architectureFilter, setArchitectureFilter] = useState(archQuery);
	const [showUntagged, setShowUntagged] = useState(
		showUntaggedQuery === "true",
	);
	const [selectedSources, setSelectedSources] = useState<string[]>(() => {
		return sourcesQuery ? sourcesQuery.split(",") : [];
	});

	const [untaggedDialog, setUntaggedDialog] = useState({
		open: false,
		repositoryName: "",
	});

	const cardsGridRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (cardsGridRef.current) {
			autoAnimate(cardsGridRef.current, {
				duration: 250,
				easing: "ease-in-out",
			});
		}
	}, []);

	const architectures = React.useMemo(() => {
		return ["all", ...availableArchitectures];
	}, [availableArchitectures]);

	const availableSources = React.useMemo(() => {
		return Object.entries(sources).map(([key, source]) => ({
			key,
			host: source.host,
		}));
	}, [sources]);

	const getSourceHost = useCallback(
		(sourceName?: string) => {
			if (!sourceName || !sources[sourceName]) {
				return "Unknown";
			}
			return sources[sourceName].host;
		},
		[sources],
	);

	useEffect(() => {
		if (
			hydrated &&
			architectureFilter !== "all" &&
			!availableArchitectures.includes(architectureFilter)
		) {
			setArchitectureFilter("all");
			const newSearchParams = new URLSearchParams(searchParams);
			newSearchParams.delete("arch");
			setSearchParams(newSearchParams);
		}
	}, [
		hydrated,
		availableArchitectures,
		architectureFilter,
		searchParams,
		setSearchParams,
	]);

	useEffect(() => {
		if (!hydrated) return;

		startPeriodicRefresh();

		if (repositoryMetas.length === 0) {
			fetchRepositoryMetas();
		}

		return stopPeriodicRefresh;
	}, [
		hydrated,
		repositoryMetas.length,
		fetchRepositoryMetas,
		startPeriodicRefresh,
		stopPeriodicRefresh,
	]);

	const filteredRepos = useMemo(() => {
		if (!hydrated) {
			return [];
		}

		let filtered = repositoryMetas;

		if (searchQuery) {
			filtered = filtered.filter(
				(repo: RepositoryMeta) =>
					repo.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
					repo.namespace?.toLowerCase().includes(searchQuery.toLowerCase()),
			);
		}

		if (architectureFilter !== "all") {
			filtered = filtered.filter((repo) =>
				repo.architectures?.includes(architectureFilter),
			);
		}

		if (selectedSources.length > 0) {
			filtered = filtered.filter((repo) => {
				const sourceHost = getSourceHost(repo.source);
				return selectedSources.includes(sourceHost);
			});
		}

		if (!showUntagged) {
			filtered = filtered.filter((repo) => {
				return repo.tagCount > 0;
			});
		}

		return filtered;
	}, [
		repositoryMetas,
		searchQuery,
		architectureFilter,
		selectedSources,
		showUntagged,
		hydrated,
		getSourceHost,
	]);

	const handleArchitectureChange = (event: SelectChangeEvent) => {
		const newArch = event.target.value;
		setArchitectureFilter(newArch);

		const newSearchParams = new URLSearchParams(searchParams);
		if (newArch === "all") {
			newSearchParams.delete("arch");
		} else {
			newSearchParams.set("arch", newArch);
		}
		setSearchParams(newSearchParams);
	};

	const handleSourceChange = (sourceHost: string, checked: boolean) => {
		let newSelectedSources: string[];
		if (checked) {
			newSelectedSources = [...selectedSources, sourceHost];
		} else {
			newSelectedSources = selectedSources.filter((s) => s !== sourceHost);
		}
		setSelectedSources(newSelectedSources);

		const newSearchParams = new URLSearchParams(searchParams);
		if (newSelectedSources.length === 0) {
			newSearchParams.delete("sources");
		} else {
			newSearchParams.set("sources", newSelectedSources.join(","));
		}
		setSearchParams(newSearchParams);
	};

	const handleShowUntaggedChange = (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const newShowUntagged = event.target.checked;
		setShowUntagged(newShowUntagged);

		const newSearchParams = new URLSearchParams(searchParams);
		if (newShowUntagged) {
			newSearchParams.set("showUntagged", "true");
		} else {
			newSearchParams.delete("showUntagged");
		}
		setSearchParams(newSearchParams);
	};

	const handleUntaggedRepositoryClick = (repo: RepositoryMeta) => {
		const fullName = repo.namespace
			? `${repo.namespace}/${repo.name}`
			: repo.name;
		setUntaggedDialog({
			open: true,
			repositoryName: fullName,
		});
	};

	const handleCloseUntaggedDialog = () => {
		setUntaggedDialog({
			open: false,
			repositoryName: "",
		});
	};

	const getRepositoryPath = (repo: RepositoryMeta) => {
		const basePath = repo.namespace
			? `/repository/${repo.namespace}/${repo.name}`
			: `/repository/${repo.name}`;
		return repo.source
			? `${basePath}?source=${encodeURIComponent(repo.source)}`
			: basePath;
	};

	const getDisplayName = (repo: RepositoryMeta) => {
		return repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name;
	};

	return (
		<Box
			sx={{
				bgcolor: "background.default",
				height: "calc(100vh - 64px)",
				display: "flex",
				flexDirection: { xs: "column", md: "row" },
				overflow: "hidden",
			}}
		>
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
					{availableSources.map((source) => (
						<FormControlLabel
							key={source.key}
							control={
								<Checkbox
									checked={selectedSources.includes(source.host)}
									onChange={(e) =>
										handleSourceChange(source.host, e.target.checked)
									}
									size="small"
									sx={{
										color: "primary.main",
										"&.Mui-checked": {
											color: "primary.main",
										},
									}}
								/>
							}
							label={source.host}
							sx={{
								mb: 0.5,
								"& .MuiFormControlLabel-label": {
									fontSize: "0.875rem",
									color: "text.primary",
								},
							}}
						/>
					))}
				</Box>

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
							{architectures.map((arch) => (
								<MenuItem key={arch} value={arch} sx={{ fontSize: "0.875rem" }}>
									{arch === "all" ? "All Architectures" : arch}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>

				<Box sx={{ mb: 3 }}>
					<FormControlLabel
						control={
							<Checkbox
								checked={showUntagged}
								onChange={handleShowUntaggedChange}
								size="small"
								sx={{
									"& .MuiSvgIcon-root": {
										fontSize: "1rem",
									},
								}}
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

			<Box
				sx={{
					flexGrow: 1,
					p: { xs: 2, md: 4 },
					overflowY: "auto",
					height: { xs: "calc(100vh - 64px - 200px)", md: "100%" },
				}}
			>
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
								1 - {filteredRepos.length} of {filteredRepos.length} available
								results.
							</Typography>
							{loading && <CircularProgress size={16} />}
						</Box>
						{loading && (
							<Box sx={{ width: "100%", maxWidth: 400 }}>
								<LinearProgress
									variant="determinate"
									value={loadingStage.progress}
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
									{loadingStage.message}
								</Typography>
							</Box>
						)}
					</Box>
				</Box>

				{error && (
					<Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
						{error}
					</Alert>
				)}

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
					{loading && repositoryMetas.length === 0 ? (
						<Box sx={{ textAlign: "center", py: 8 }}>
							<CircularProgress />
							<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
								Loading repositories...
							</Typography>
						</Box>
					) : filteredRepos.length === 0 ? (
						<Box sx={{ textAlign: "center", py: 8 }}>
							<Typography variant="h6" color="text.secondary" gutterBottom>
								No repositories found
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Try adjusting your search or filters
							</Typography>
						</Box>
					) : (
						filteredRepos.map((repo) => (
							<Card
								key={`${repo.namespace || ""}/${repo.name}`}
								elevation={0}
								variant="outlined"
								sx={{
									height: {
										xs: "auto", // Mobile: flexible height for readability
										sm: "190px", // Small screens: increased height for 2-row chips
										md: "170px", // Medium screens: increased height for 2-row chips
									},
									minHeight: {
										xs: "140px", // Minimum height for mobile
									},
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
								{repo.tagCount === 0 ? (
									<CardActionArea
										onClick={() => handleUntaggedRepositoryClick(repo)}
										sx={{
											textDecoration: "none",
											color: "inherit",
											flexGrow: 1,
											display: "flex",
											flexDirection: "column",
											cursor: "help",
											"&:hover": {
												bgcolor: "action.hover",
											},
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
													{getDisplayName(repo)}
												</Typography>
											</Box>
											<Box
												sx={{
													flexGrow: 1,
													display: "flex",
													flexDirection: "column",
													justifyContent: "flex-start",
													minHeight: {
														xs: "52px", // Mobile: 2 rows minimum with padding
														sm: "48px", // Small screens: 2 rows minimum with padding
														md: "44px", // Medium screens: 2 rows minimum with padding
													},
													maxHeight: {
														xs: "auto", // Mobile: flexible for readability
														sm: "48px", // Small+ screens: max 2 rows with padding
														md: "44px",
													},
												}}
											>
												<Box
													sx={{
														display: "flex",
														gap: 0.5,
														flexWrap: "wrap",
														minHeight: {
															xs: "40px", // Mobile: space for 2 rows with padding
															sm: "40px", // Small+ screens: space for 2 rows with padding
														},
														maxHeight: {
															xs: "auto", // Mobile: flexible for readability
															sm: "40px", // Small+ screens: max 2 rows with padding
														},
														overflow: "hidden",
														mb: 1,
														alignContent: "flex-start",
													}}
												>
													<Chip
														label="untagged"
														size="small"
														variant="outlined"
														sx={{
															fontSize: "0.7rem",
															height: 18,
															borderColor: "warning.main",
															color: "warning.main",
															"& .MuiChip-label": {
																px: 0.5,
															},
														}}
													/>
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
														0 B
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
													{getSourceHost(repo.source)}
												</Typography>
											</Box>
										</CardContent>
									</CardActionArea>
								) : (
									<CardActionArea
										component={Link}
										to={getRepositoryPath(repo)}
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
													{getDisplayName(repo)}
												</Typography>
											</Box>

											<Box
												sx={{
													flexGrow: 1,
													display: "flex",
													flexDirection: "column",
													justifyContent: "flex-start",
													minHeight: {
														xs: "52px", // Mobile: 2 rows minimum with padding
														sm: "48px", // Small screens: 2 rows minimum with padding
														md: "44px", // Medium screens: 2 rows minimum with padding
													},
													maxHeight: {
														xs: "auto", // Mobile: no height limit for readability
														sm: "48px", // Small screens: exactly 2 rows with padding
														md: "44px", // Medium screens: exactly 2 rows with padding
													},
												}}
											>
												<Box
													sx={{
														display: "flex",
														gap: 0.5,
														flexWrap: "wrap",
														minHeight: {
															xs: "40px", // Mobile: space for 2 rows with padding
															sm: "40px", // Small+ screens: space for 2 rows with padding
														},
														maxHeight: {
															xs: "auto", // Mobile: flexible for readability
															sm: "40px", // Small+ screens: max 2 rows with padding
														},
														overflow: "hidden",
														mb: 1,
														alignContent: "flex-start",
													}}
												>
													{repo.architectures &&
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
																			"& .MuiChip-label": {
																				px: 0.5,
																			},
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
																		"& .MuiChip-label": {
																			px: 0.5,
																		},
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
														{repo.totalSizeFormatted || "Unknown"}
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
													{getSourceHost(repo.source)}
												</Typography>
											</Box>
										</CardContent>
									</CardActionArea>
								)}
							</Card>
						))
					)}
				</Box>
			</Box>

			<Dialog
				open={untaggedDialog.open}
				onClose={handleCloseUntaggedDialog}
				aria-labelledby="untagged-dialog-title"
				aria-describedby="untagged-dialog-description"
				sx={{
					bgcolor: "#11151a",
					color: "text.primary",
				}}
			>
				<DialogTitle id={dialogTitleId}>Untagged Repository</DialogTitle>
				<DialogContent>
					<DialogContentText id={dialogDescriptionId}>
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
					<Button onClick={handleCloseUntaggedDialog} autoFocus>
						OK
					</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
}

export default ExplorePage;
