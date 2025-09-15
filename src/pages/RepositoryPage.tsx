import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
	Delete as DeleteIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	Alert,
	Box,
	Breadcrumbs,
	ButtonBase,
	Card,
	CardContent,
	Chip,
	CircularProgress,
	Divider,
	FormControl,
	IconButton,
	InputAdornment,
	MenuItem,
	Link as MuiLink,
	Select,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	TextField,
	Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { SelectiveDeleteDialog } from "../components/SelectiveDeleteDialog";
import { useRepositoryStore } from "../store/repositoryStore";
import { useSnackbarStore } from "../store/snackbarStore";
import { useSimpleClipboard } from "../utils/useClipboard";

function RepositoryPage() {
	const { name, namespace } = useParams<{ name: string; namespace?: string }>();
	const [searchParams] = useSearchParams();
	const source = searchParams.get("source") || undefined;
	const {
		repositoryDetails,
		fetchRepositoryDetail,
		error,
		clearError,
		deleteTag,
		sources,
	} = useRepositoryStore();
	const { showSnackbar } = useSnackbarStore();
	const [loading, setLoading] = useState(false);
	const [sortBy, setSortBy] = useState("newest");
	const [filterQuery, setFilterQuery] = useState("");
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const [tagsContainerRef] = useAutoAnimate();

	const repoKey = useMemo(
		() => (namespace ? `${namespace}/${name}` : name || ""),
		[name, namespace],
	);
	const repository = repositoryDetails[repoKey];

	const getSourceHost = () => {
		if (!source || !sources[source]) {
			return null;
		}
		return sources[source].host;
	};

	const filteredAndSortedTags = useMemo(() => {
		if (!repository?.tags) return [];

		let filteredTags = repository.tags;

		if (filterQuery.trim()) {
			filteredTags = filteredTags.filter((tag) =>
				tag.name.toLowerCase().includes(filterQuery.toLowerCase()),
			);
		}

		return [...filteredTags].sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return (
						new Date(b.lastUpdated).getTime() -
						new Date(a.lastUpdated).getTime()
					);
				case "oldest":
					return (
						new Date(a.lastUpdated).getTime() -
						new Date(b.lastUpdated).getTime()
					);
				case "name":
					return a.name.localeCompare(b.name);
				case "size": {
					const getSizeInBytes = (sizeStr: string) => {
						const match = sizeStr.match(/^([\d.]+)\s*(B|KB|MB|GB|TB)$/);
						if (!match) return 0;
						const value = parseFloat(match[1]);
						const unit = match[2];
						const multipliers = {
							B: 1,
							KB: 1024,
							MB: 1024 ** 2,
							GB: 1024 ** 3,
							TB: 1024 ** 4,
						};
						return value * (multipliers[unit as keyof typeof multipliers] || 1);
					};
					return getSizeInBytes(b.size) - getSizeInBytes(a.size);
				}
				default:
					return (
						new Date(b.lastUpdated).getTime() -
						new Date(a.lastUpdated).getTime()
					);
			}
		});
	}, [repository?.tags, filterQuery, sortBy]);

	const totalSize = repository?.totalSizeFormatted;

	useEffect(() => {
		if (!name) return;

		if (repository) {
			setLoading(false);
			return;
		}

		let isMounted = true;
		setLoading(true);

		fetchRepositoryDetail(name, namespace, source).finally(() => {
			if (isMounted) {
				setLoading(false);
			}
		});

		return () => {
			isMounted = false;
		};
	}, [name, namespace, source, repository, fetchRepositoryDetail]);

	useEffect(() => {
		if (!name) return;

		const interval = setInterval(() => {
			if (!document.hidden) {
				fetchRepositoryDetail(name, namespace, source);
			}
		}, 15000);

		return () => {
			clearInterval(interval);
		};
	}, [name, namespace, source, fetchRepositoryDetail]);

	const copyToClipboard = useSimpleClipboard(
		(method) => {
			const methodMessages: {
				[key: string]: string;
			} = {
				modern: "Docker pull command copied to clipboard!",
				fallback: "Docker pull command copied to clipboard!",
				manual: "Please copy the command from the dialog.",
			};

			showSnackbar(methodMessages[method], "success");
		},
		(error) => {
			console.error("Copy failed:", error);
			showSnackbar(
				"Failed to copy to clipboard. Please copy manually.",
				"error",
			);
		},
	);

	const handleSortChange = (event: SelectChangeEvent) => {
		setSortBy(event.target.value);
	};

	const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilterQuery(event.target.value);
	};

	const handleDeleteTag = async (tagName: string) => {
		const repoName = getRepositoryDisplayName();
		const confirmMessage = `Are you sure you want to delete tag "${tagName}" from ${repoName}?`;
		if (window.confirm(confirmMessage)) {
			const success = await deleteTag(name || "", tagName, namespace);
			if (success) {
				showSnackbar(
					`Tag "${tagName}" deleted successfully. To reclaim storage, run registry garbage collection: "registry garbage-collect <config>"`,
					"success",
					8000,
				);
				fetchRepositoryDetail(name || "", namespace, source);
			} else {
				showSnackbar("Failed to delete tag. Please try again.", "error");
			}
		}
	};

	const handleDeleteRepository = () => {
		setDeleteDialogOpen(true);
	};

	const getRepositoryDisplayName = () => {
		if (!repository && !name) return "";
		if (repository) {
			return repository.namespace
				? `${repository.namespace}/${repository.name}`
				: repository.name;
		}
		return namespace ? `${namespace}/${name}` : name || "";
	};

	const getDockerPullCommand = (tagName: string) => {
		const host = getSourceHost();
		const repoName = getRepositoryDisplayName();

		if (host) {
			return `docker pull ${host}/${repoName}:${tagName}`;
		}
		return `docker pull ${repoName}:${tagName}`;
	};

	const getRelativeTimeString = (dateString: string) => {
		const now = new Date();
		const date = new Date(dateString);
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

		if (diffInSeconds < 60) {
			return "just now";
		} else if (diffInSeconds < 3600) {
			const minutes = Math.floor(diffInSeconds / 60);
			return `about ${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 86400) {
			const hours = Math.floor(diffInSeconds / 3600);
			return `about ${hours} hour${hours !== 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 2592000) {
			const days = Math.floor(diffInSeconds / 86400);
			return `about ${days} day${days !== 1 ? "s" : ""} ago`;
		} else if (diffInSeconds < 31536000) {
			const months = Math.floor(diffInSeconds / 2592000);
			return `about ${months} month${months !== 1 ? "s" : ""} ago`;
		} else {
			const years = Math.floor(diffInSeconds / 31536000);
			return `about ${years} year${years !== 1 ? "s" : ""} ago`;
		}
	};

	if (loading) {
		return (
			<Box
				sx={{
					minHeight: "100vh",
					bgcolor: "background.default",
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
				}}
			>
				<Box sx={{ textAlign: "center" }}>
					<CircularProgress />
					<Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
						Loading repository details...
					</Typography>
				</Box>
			</Box>
		);
	}

	if (!repository && !loading) {
		return (
			<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
				<Box sx={{ p: 3 }}>
					{error && (
						<Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
							{error}
						</Alert>
					)}
					<Typography variant="h4">Repository not found</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
						The repository "{getRepositoryDisplayName()}" could not be loaded.
					</Typography>
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
			<Box sx={{ p: 3 }}>
				{/* Breadcrumbs */}
				<Breadcrumbs sx={{ mb: 3 }}>
					<MuiLink component={Link} to="/" color="primary">
						Explore
					</MuiLink>
					{getSourceHost() && (
						<Typography color="text.secondary" variant="body2">
							{getSourceHost()}
						</Typography>
					)}
					{(repository?.namespace || namespace) && (
						<Typography color="text.primary">
							{repository?.namespace || namespace}
						</Typography>
					)}
					<Typography color="text.primary">
						{repository?.name || name}
					</Typography>
				</Breadcrumbs>

				{error && (
					<Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
						{error}
					</Alert>
				)}

				{/* Repository Header */}
				<Box
					sx={{
						mb: 4,
						display: "flex",
						justifyContent: "space-between",
						alignItems: "flex-start",
					}}
				>
					<Box>
						<Typography
							variant="h3"
							gutterBottom
							sx={{ color: "text.primary" }}
						>
							{getRepositoryDisplayName()}
						</Typography>
						<Box
							sx={{
								display: "flex",
								gap: 3,
								alignItems: "center",
								flexWrap: "wrap",
							}}
						>
							<Typography variant="body1" color="text.secondary">
								{repository?.tagCount || 0} tag
								{(repository?.tagCount || 0) !== 1 ? "s" : ""} available
							</Typography>
							{totalSize && (
								<Typography variant="body1" color="text.secondary">
									Total size: {totalSize}
								</Typography>
							)}
							{repository?.architectures &&
								repository.architectures.length > 0 && (
									<Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
										<Typography
											variant="body1"
											color="text.secondary"
											sx={{ mr: 1 }}
										>
											Architectures:
										</Typography>
										{repository.architectures.map((arch) => (
											<Chip
												key={arch}
												label={arch}
												size="small"
												variant="outlined"
												sx={{
													borderColor: "primary.main",
													color: "primary.main",
													fontSize: "0.75rem",
													height: "24px",
												}}
											/>
										))}
									</Box>
								)}
						</Box>
					</Box>
					<IconButton
						onClick={handleDeleteRepository}
						sx={{
							color: "#f44336",
							"&:hover": {
								bgcolor: "rgba(244, 67, 54, 0.1)",
								color: "#d32f2f",
							},
						}}
						aria-label="Delete repository"
					>
						<DeleteIcon />
					</IconButton>
				</Box>

				{/* Divider between general info and tags section */}
				<Divider sx={{ mb: 3 }} />

				{/* Tags Filter and Sort Section */}
				{repository?.tags && repository.tags.length > 0 && (
					<Box
						sx={{
							mb: 3,
							display: "flex",
							gap: 2,
							alignItems: "center",
							flexWrap: "wrap",
						}}
					>
						{/* Sort by dropdown */}
						<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
							<Typography
								variant="body2"
								sx={{ color: "text.secondary", minWidth: "60px" }}
							>
								Sort by
							</Typography>
							<FormControl size="small" sx={{ minWidth: 120 }}>
								<Select
									value={sortBy}
									onChange={handleSortChange}
									sx={{
										"& .MuiOutlinedInput-notchedOutline": {
											borderColor: "divider",
										},
									}}
								>
									<MenuItem value="newest">Newest</MenuItem>
									<MenuItem value="oldest">Oldest</MenuItem>
									<MenuItem value="name">Name</MenuItem>
									<MenuItem value="size">Size</MenuItem>
								</Select>
							</FormControl>
						</Box>

						{/* Filter tags input */}
						<TextField
							placeholder="Filter tags"
							value={filterQuery}
							onChange={handleFilterChange}
							size="small"
							sx={{
								flexGrow: 1,
								maxWidth: 300,
								"& .MuiOutlinedInput-root": {
									"& fieldset": {
										borderColor: "divider",
									},
								},
							}}
							InputProps={{
								startAdornment: (
									<InputAdornment position="start">
										<SearchIcon
											sx={{ color: "text.secondary", fontSize: 20 }}
										/>
									</InputAdornment>
								),
							}}
						/>

						{/* Results count */}
						<Typography
							variant="body2"
							sx={{ color: "text.secondary", ml: "auto" }}
						>
							{filteredAndSortedTags.length} of {repository.tags.length} tags
						</Typography>
					</Box>
				)}

				{/* Tags Section */}
				<Box ref={tagsContainerRef} sx={{ bgcolor: "background.default" }}>
					{loading && (
						<Box sx={{ textAlign: "center", py: 8 }}>
							<CircularProgress size={32} sx={{ mb: 2 }} />
							<Typography variant="h6" color="text.secondary" gutterBottom>
								Loading repository details...
							</Typography>
							<Typography variant="body2" color="text.secondary">
								Fetching tag information and metadata.
							</Typography>
						</Box>
					)}
					{filteredAndSortedTags.length > 0 ? (
						filteredAndSortedTags.map((tag) => (
							<Box
								key={tag.name}
								sx={{
									mb: 3,
									p: 3,
									bgcolor: "background.paper",
									borderRadius: 2,
									border: "1px solid",
									borderColor: "divider",
								}}
							>
								{/* Tag Header */}
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
										pb: 2,
									}}
								>
									<Box>
										<Box
											sx={{
												display: "flex",
												alignItems: "center",
												gap: 2,
												mb: 1,
											}}
										>
											<Typography
												variant="h6"
												sx={{
													color: "primary.main",
													fontFamily: "monospace",
													fontSize: "1rem",
												}}
											>
												{tag.name}
											</Typography>
											{tag.lastUpdated && (
												<Typography
													variant="body2"
													sx={{
														color: "text.secondary",
														fontSize: "0.875rem",
													}}
												>
													Last updated {getRelativeTimeString(tag.lastUpdated)}
												</Typography>
											)}
											<IconButton
												onClick={() => handleDeleteTag(tag.name)}
												size="small"
												sx={{
													color: "#f44336",
													ml: "auto",
													"&:hover": {
														bgcolor: "rgba(244, 67, 54, 0.1)",
														color: "#d32f2f",
													},
												}}
												aria-label={`Delete tag ${tag.name}`}
											>
												<DeleteIcon fontSize="small" />
											</IconButton>
										</Box>
									</Box>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										<ButtonBase
											onClick={async (e) => {
												e.preventDefault();
												await copyToClipboard(getDockerPullCommand(tag.name));
											}}
											sx={{
												bgcolor: "#1a1e23",
												border: "1px solid #2f3336",
												borderRadius: 1,
												p: 1.5,
												flexGrow: 1,
												position: "relative",
												overflow: "hidden",
												display: "flex",
												alignItems: "center",
												"&:hover": {
													bgcolor: "#2a2e33",
													"& .copy-text": {
														opacity: 0.95,
													},
												},
												"&:active": {
													transform: "scale(0.98)",
												},
												transition: "all 0.2s ease-in-out",
											}}
											aria-label={`Copy docker pull command for ${tag.name}`}
											title={`Click to copy: ${getDockerPullCommand(tag.name)}`}
										>
											<Typography
												variant="body2"
												sx={{
													fontFamily: "monospace",
													fontSize: "0.75rem",
													color: "text.primary",
													whiteSpace: "nowrap",
												}}
											>
												{getDockerPullCommand(tag.name)}
											</Typography>
											<Typography
												variant="body2"
												className="copy-text"
												sx={{
													position: "absolute",
													right: 12,
													top: "50%",
													transform: "translateY(-50%)",
													color: "white",
													fontSize: "0.75rem",
													fontWeight: 500,
													opacity: 0,
													transition: "opacity 0.2s",
													bgcolor: "primary.main",
													px: 1,
													py: 0.5,
													borderRadius: 0.5,
												}}
											>
												Copy
											</Typography>
										</ButtonBase>
									</Box>
								</Box>

								{/* Tag Details Table */}
								<Card
									elevation={0}
									variant="outlined"
									sx={{ bgcolor: "transparent", borderColor: "divider" }}
								>
									<CardContent sx={{ p: 2 }}>
										<TableContainer>
											<Table size="small">
												<TableHead>
													<TableRow>
														<TableCell
															sx={{
																color: "text.primary",
																fontWeight: "bold",
																borderColor: "divider",
															}}
														>
															Digest
														</TableCell>
														<TableCell
															sx={{
																color: "text.primary",
																fontWeight: "bold",
																borderColor: "divider",
															}}
														>
															OS/ARCH
														</TableCell>
														<TableCell
															sx={{
																color: "text.primary",
																fontWeight: "bold",
																borderColor: "divider",
															}}
														>
															Size
														</TableCell>
													</TableRow>
												</TableHead>
												<TableBody>
													{tag.architectures.map((archInfo, archIndex) => (
														<TableRow
															key={`${tag.name}-${archInfo.architecture}-${archIndex}`}
															hover
															sx={{
																borderBottom:
																	archIndex < tag.architectures.length - 1
																		? 1
																		: 0,
																borderColor: "divider",
															}}
														>
															<TableCell sx={{ borderColor: "divider" }}>
																<Typography
																	variant="body2"
																	sx={{
																		fontFamily: "monospace",
																		fontSize: "0.875rem",
																		color: "primary.main",
																		cursor: "pointer",
																	}}
																	title={archInfo.digest || "Unknown"}
																>
																	{archInfo.digest
																		? archInfo.digest.substring(0, 12)
																		: "Unknown"}
																</Typography>
															</TableCell>
															<TableCell sx={{ borderColor: "divider" }}>
																<Typography
																	variant="body2"
																	sx={{ color: "text.primary" }}
																>
																	{archInfo.os}/{archInfo.architecture}
																</Typography>
															</TableCell>
															<TableCell sx={{ borderColor: "divider" }}>
																<Typography
																	variant="body2"
																	sx={{ color: "text.primary" }}
																>
																	{archInfo.size}
																</Typography>
															</TableCell>
														</TableRow>
													))}
												</TableBody>
											</Table>
										</TableContainer>
									</CardContent>
								</Card>
							</Box>
						))
					) : (
						<Box sx={{ textAlign: "center", py: 8 }}>
							<Typography variant="h6" color="text.secondary" gutterBottom>
								{repository?.tags && repository.tags.length > 0
									? "No matching tags found"
									: "No tags found"}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{repository?.tags && repository.tags.length > 0
									? "Try adjusting your filter criteria"
									: "This repository doesn't have any tags yet."}
							</Typography>
						</Box>
					)}
				</Box>
				{repository && (
					<SelectiveDeleteDialog
						open={deleteDialogOpen}
						onClose={() => setDeleteDialogOpen(false)}
						repositoryName={getRepositoryDisplayName()}
						repositoryKey={repoKey}
						tags={repository.tags || []}
					/>
				)}
			</Box>
		</Box>
	);
}

export default RepositoryPage;
