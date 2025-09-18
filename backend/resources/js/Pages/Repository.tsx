import { Link, router, usePage, usePoll } from "@inertiajs/react";
import {
	Delete as DeleteIcon,
	Refresh as RefreshIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	Box,
	Breadcrumbs,
	ButtonBase,
	Card,
	CardContent,
	Chip,
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
import type React from "react";
import { useMemo, useState } from "react";

interface ArchitectureData {
	digest: string;
	os: string;
	architecture: string;
	size: string;
	media_type: string;
}

interface TagData {
	name: string;
	last_updated: string;
	size: string;
	architectures: ArchitectureData[];
}

interface RepositoryData {
	id: number;
	name: string;
	namespace?: string;
	full_name: string;
	source: string;
	tag_count: number;
	total_size: number;
	total_size_formatted: string;
	architectures: string[];
	registry_host: string;
	tags: TagData[];
}

interface SourceData {
	key: string;
	host: string;
	status: number;
}

interface RepositoryPageProps {
	repository?: RepositoryData;
	sources: Record<string, SourceData>;
}

const Repository: React.FC = () => {
	const { props } = usePage<RepositoryPageProps>();
	const { repository, sources } = props;

	const [sortBy, setSortBy] = useState("newest");
	const [filterQuery, setFilterQuery] = useState("");
	const [isRefreshing, setIsRefreshing] = useState(false);

	// Auto-refresh repository data every 5 seconds to detect new images
	usePoll(
		5000,
		{
			only: ["repository"],
		},
		{
			preserveState: true,
			preserveScroll: true,
		},
	);

	const getSourceHost = () => {
		if (!repository?.source || !sources[repository.source]) {
			return null;
		}
		return sources[repository.source].host;
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
						new Date(b.last_updated).getTime() -
						new Date(a.last_updated).getTime()
					);
				case "oldest":
					return (
						new Date(a.last_updated).getTime() -
						new Date(b.last_updated).getTime()
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
						new Date(b.last_updated).getTime() -
						new Date(a.last_updated).getTime()
					);
			}
		});
	}, [repository?.tags, filterQuery, sortBy]);

	const handleSortChange = (event: SelectChangeEvent) => {
		setSortBy(event.target.value);
	};

	const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setFilterQuery(event.target.value);
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);
		try {
			// Trigger a refresh of repository data from the registry
			const response = await fetch("/api/refresh", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
			});

			if (response.ok) {
				// Wait a moment for the background sync to complete
				setTimeout(() => {
					router.reload({ only: ["repository"] });
					setIsRefreshing(false);
				}, 1500);
			} else {
				console.error("Failed to trigger refresh");
				setIsRefreshing(false);
			}
		} catch (error) {
			console.error("Error triggering refresh:", error);
			setIsRefreshing(false);
		}
	};

	const getRepositoryDisplayName = () => {
		if (!repository) return "";
		return repository.namespace
			? `${repository.namespace}/${repository.name}`
			: repository.name;
	};

	const getDockerPullCommand = (tagName: string) => {
		const host = getSourceHost();
		const repoName = getRepositoryDisplayName();

		if (host) {
			return `docker pull ${host}/${repoName}:${tagName}`;
		}
		return `docker pull ${repoName}:${tagName}`;
	};

	const copyToClipboard = async (text: string) => {
		try {
			await navigator.clipboard.writeText(text);
			// You could add a toast notification here
		} catch (err) {
			console.error("Failed to copy to clipboard:", err);
		}
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

	const handleDeleteImage = async (digest: string, mediaType: string) => {
		if (
			!confirm(
				"Are you sure you want to delete this image? This action cannot be undone.",
			)
		) {
			return;
		}

		try {
			const params = new URLSearchParams({
				name: repository?.name || "",
				digest: digest,
			});

			if (repository?.namespace) {
				params.append("namespace", repository.namespace);
			}

			if (repository?.source) {
				params.append("source", repository.source);
			}

			router.delete(`/r/delete?${params.toString()}`, {
				onSuccess: () => {
					router.reload({ only: ["repository"] });
				},
			});
		} catch (error) {
			console.error("Failed to delete image:", error);
			alert("Failed to delete image. Please try again.");
		}
	};

	const handleDeleteTag = async (tagName: string) => {
		if (
			!confirm(
				`Are you sure you want to delete the entire tag "${tagName}" and all its architecture images? This action cannot be undone.`,
			)
		) {
			return;
		}

		try {
			const params = new URLSearchParams({
				name: repository?.name || "",
				tag: tagName,
			});

			if (repository?.namespace) {
				params.append("namespace", repository.namespace);
			}

			if (repository?.source) {
				params.append("source", repository.source);
			}

			router.delete(`/r/delete-tag?${params.toString()}`, {
				onSuccess: () => {
					router.reload({ only: ["repository"] });
				},
			});
		} catch (error) {
			console.error("Failed to delete tag:", error);
			alert("Failed to delete tag. Please try again.");
		}
	};

	if (!repository) {
		return (
			<Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
				<Box sx={{ p: 3 }}>
					<Typography variant="h4">Repository not found</Typography>
					<Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
						The requested repository could not be loaded.
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
					<Link href="/">
						<MuiLink color="primary" component="span">
							Explore
						</MuiLink>
					</Link>
					{getSourceHost() && (
						<Typography color="text.secondary" variant="body2">
							{getSourceHost()}
						</Typography>
					)}
					{repository.namespace && (
						<Typography color="text.primary">{repository.namespace}</Typography>
					)}
					<Typography color="text.primary">{repository.name}</Typography>
				</Breadcrumbs>

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
								{repository.tag_count || 0} tag
								{(repository.tag_count || 0) !== 1 ? "s" : ""} available
							</Typography>
							{repository.total_size_formatted && (
								<Typography variant="body1" color="text.secondary">
									Total size: {repository.total_size_formatted}
								</Typography>
							)}
							{repository.architectures &&
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
					<Box>
						<IconButton
							onClick={handleRefresh}
							disabled={isRefreshing}
							sx={{
								color: "primary.main",
								"&:hover": {
									bgcolor: "primary.light",
									color: "primary.contrastText",
								},
								"&.Mui-disabled": {
									color: "text.disabled",
								},
							}}
							title="Refresh repository data"
						>
							<RefreshIcon
								sx={{
									animation: isRefreshing ? "spin 1s linear infinite" : "none",
									"@keyframes spin": {
										"0%": {
											transform: "rotate(0deg)",
										},
										"100%": {
											transform: "rotate(360deg)",
										},
									},
								}}
							/>
						</IconButton>
					</Box>
				</Box>

				{/* Divider between general info and tags section */}
				<Divider sx={{ mb: 3 }} />

				{/* Tags Filter and Sort Section */}
				{repository.tags && repository.tags.length > 0 && (
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
				<Box sx={{ bgcolor: "background.default" }}>
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
											{tag.last_updated && (
												<Typography
													variant="body2"
													sx={{
														color: "text.secondary",
														fontSize: "0.875rem",
													}}
												>
													Last updated {getRelativeTimeString(tag.last_updated)}
												</Typography>
											)}
										</Box>
									</Box>
									<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
										<IconButton
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteTag(tag.name);
											}}
											size="small"
											sx={{
												color: "error.main",
												"&:hover": {
													bgcolor: "error.light",
													color: "error.contrastText",
												},
											}}
											title={`Delete entire tag "${tag.name}" and all its images`}
										>
											<DeleteIcon fontSize="small" />
										</IconButton>
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
														<TableCell
															sx={{
																color: "text.primary",
																fontWeight: "bold",
																borderColor: "divider",
																width: "60px",
															}}
														>
															Actions
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
															<TableCell sx={{ borderColor: "divider" }}>
																<IconButton
																	onClick={(e) => {
																		e.stopPropagation();
																		handleDeleteImage(
																			archInfo.digest,
																			archInfo.media_type,
																		);
																	}}
																	size="small"
																	sx={{
																		color: "error.main",
																		"&:hover": {
																			bgcolor: "error.light",
																			color: "error.contrastText",
																		},
																	}}
																	title="Delete this image"
																>
																	<DeleteIcon fontSize="small" />
																</IconButton>
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
								{repository.tags && repository.tags.length > 0
									? "No matching tags found"
									: "No tags found"}
							</Typography>
							<Typography variant="body2" color="text.secondary">
								{repository.tags && repository.tags.length > 0
									? "Try adjusting your filter criteria"
									: "This repository doesn't have any tags yet."}
							</Typography>
						</Box>
					)}
				</Box>
			</Box>
		</Box>
	);
};

export default Repository;
