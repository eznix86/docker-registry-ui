import { autoAnimate } from "@formkit/auto-animate";
import { SearchOff as SearchOffIcon } from "@mui/icons-material";
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
	Tooltip,
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

const gridSx = {
	display: "grid",
	gridTemplateColumns: {
		xs: "1fr",
		sm: "repeat(2, 1fr)",
		md: "repeat(2, 1fr)",
		lg: "repeat(3, 1fr)",
	},
	gap: 2,
};

const filterTitleSx = {
	color: "text.primary",
	mb: 3,
};

import { Link, useSearchParams } from "react-router-dom";
import {
	type RepositoryMeta,
	useRepositoryStore,
	useShallow,
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
		fetchStatusCodes,
		getStatusCodeInfo,
		startPeriodicRefresh,
		stopPeriodicRefresh,
		clearError,
		hydrated,
	} = useRepositoryStore(
		useShallow((state) => ({
			repositoryMetas: state.repositoryMetas,
			loading: state.loading,
			loadingStage: state.loadingStage,
			error: state.error,
			availableArchitectures: state.availableArchitectures,
			sources: state.sources,
			fetchRepositoryMetas: state.fetchRepositoryMetas,
			fetchStatusCodes: state.fetchStatusCodes,
			getStatusCodeInfo: state.getStatusCodeInfo,
			startPeriodicRefresh: state.startPeriodicRefresh,
			stopPeriodicRefresh: state.stopPeriodicRefresh,
			clearError: state.clearError,
			hydrated: state.hydrated,
		})),
	);

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

	const getStatusChipColor = useCallback((status?: number) => {
		if (!status) return "default";
		if (status >= 200 && status < 300) return "success";
		if (status >= 300 && status < 400) return "info";
		if (status >= 400 && status < 500) return "warning";
		if (status >= 500) return "error";
		return "default";
	}, []);

	const getStatusTooltip = useCallback(
		(status?: number) => {
			const statusInfo = status ? getStatusCodeInfo(status) : null;

			if (statusInfo) {
				return `${status}: ${statusInfo.message}${statusInfo.description ? ` - ${statusInfo.description}` : ""}`;
			}

			return status ? `Status: ${status}` : "No status available";
		},
		[getStatusCodeInfo],
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

		fetchStatusCodes();

		startPeriodicRefresh();

		if (repositoryMetas.length === 0) {
			fetchRepositoryMetas();
		}

		return stopPeriodicRefresh;
	}, [
		hydrated,
		repositoryMetas.length,
		fetchRepositoryMetas,
		fetchStatusCodes,
		startPeriodicRefresh,
		stopPeriodicRefresh,
	]);

	const filteredRepos = useMemo(() => {
		if (!hydrated) {
			return [];
		}

		let filtered = repositoryMetas;

		if (searchQuery) {
			const lowerSearchQuery = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(repo: RepositoryMeta) =>
					repo.name.toLowerCase().includes(lowerSearchQuery) ||
					repo.namespace?.toLowerCase().includes(lowerSearchQuery),
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

	const getRepositoryPath = useCallback((repo: RepositoryMeta) => {
		const basePath = repo.namespace
			? `/repository/${repo.namespace}/${repo.name}`
			: `/repository/${repo.name}`;
		return repo.source
			? `${basePath}?source=${encodeURIComponent(repo.source)}`
			: basePath;
	}, []);

	const getDisplayName = useCallback((repo: RepositoryMeta) => {
		return repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name;
	}, []);

	return (
		<Box sx={containerSx}>
			<Box sx={sidebarSx}>
				<Typography variant="h6" gutterBottom sx={filterTitleSx}>
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
					{availableSources.map((source) => {
						const sourceInfo = sources[source.key];
						const hasError =
							sourceInfo?.status &&
							(sourceInfo.status >= 400 || sourceInfo.status === 0);

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
												"&.Mui-checked": {
													color: "primary.main",
												},
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
								{sourceInfo?.status && sourceInfo.status !== 200 && (
									<Tooltip title={getStatusTooltip(sourceInfo.status)} arrow>
										<Chip
											label={sourceInfo.status}
											size="small"
											color={getStatusChipColor(sourceInfo.status)}
											sx={{
												height: 16,
												fontSize: "0.65rem",
												minWidth: 32,
												"& .MuiChip-label": {
													px: 0.5,
												},
											}}
										/>
									</Tooltip>
								)}
							</Box>
						);
					})}
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

				<Box ref={cardsGridRef} sx={gridSx}>
					{filteredRepos.length === 0 ? (
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
							<Typography
								variant="body1"
								color="text.secondary"
								sx={{ maxWidth: 400 }}
							>
								Try adjusting your search or filters, or check if your registry
								sources are properly configured.
							</Typography>
						</Box>
					) : (
						filteredRepos.map((repo) => (
							<Card
								key={`${repo.source || "default"}:${repo.namespace || ""}/${repo.name}`}
								elevation={0}
								variant="outlined"
								sx={{
									height: {
										xs: "auto",
										sm: "190px",
										md: "170px",
									},
									minHeight: {
										xs: "140px",
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
														xs: "52px",
														sm: "48px",
														md: "44px",
													},
													maxHeight: {
														xs: "auto",
														sm: "48px",
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
															xs: "40px",
															sm: "40px",
														},
														maxHeight: {
															xs: "auto",
															sm: "40px",
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
														xs: "52px",
														sm: "48px",
														md: "44px",
													},
													maxHeight: {
														xs: "auto",
														sm: "48px",
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
															xs: "40px",
															sm: "40px",
														},
														maxHeight: {
															xs: "auto",
															sm: "40px",
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
