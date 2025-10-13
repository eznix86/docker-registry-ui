// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	Delete as DeleteIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	alpha,
	Box,
	Breadcrumbs,
	Card,
	CardContent,
	Divider,
	FormControl,
	IconButton,
	InputAdornment,
	Link as MuiLink,
	styled,
	Typography,
} from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import {
	Chip,
	CommandBox,
	MenuItem,
	Select,
	Table,
	TextField,
} from "~/components/ui";

// Static mock data
const mockRepository = {
	name: "busybox",
	source: "local-registry",
	tagCount: 1,
	architectures: [
		"amd64",
		"armv5",
		"arm/v6",
		"arm/v7",
		"arm64/v8",
		"386",
		"ppc64le",
		"riscv64",
		"s390x",
	],
	totalSizeFormatted: "16.46 MB",
	tags: [
		{
			name: "stable",
			size: "16.46 MB",
			lastUpdated: "2023-01-15T08:45:00Z",
			architectures: [
				{
					digest: "sha256:4a35a",
					os: "linux",
					architecture: "amd64",
					variant: null,
					size: "2.11 MB",
				},
				{
					digest: "sha256:0816a",
					os: "linux",
					architecture: "armv5",
					variant: null,
					size: "1.74 MB",
				},
				{
					digest: "sha256:b51ff",
					os: "linux",
					architecture: "arm/v6",
					variant: null,
					size: "926.19 KB",
				},
				{
					digest: "sha256:917e0",
					os: "linux",
					architecture: "arm/v7",
					variant: null,
					size: "1.52 MB",
				},
				{
					digest: "sha256:aefc3",
					os: "linux",
					architecture: "arm64/v8",
					variant: null,
					size: "1.81 MB",
				},
				{
					digest: "sha256:4bd82",
					os: "linux",
					architecture: "386",
					variant: null,
					size: "2.18 MB",
				},
				{
					digest: "sha256:843b9",
					os: "linux",
					architecture: "ppc64le",
					variant: null,
					size: "2.41 MB",
				},
				{
					digest: "sha256:9fcc7",
					os: "linux",
					architecture: "riscv64",
					variant: null,
					size: "1.85 MB",
				},
				{
					digest: "sha256:bdea9",
					os: "linux",
					architecture: "s390x",
					variant: null,
					size: "1.95 MB",
				},
			],
		},
	],
};

const sourceHost = "registry.brunobernard.dev";
const sortBy = "newest";
const filterQuery = "";

// Styled Components
const PageContainer = styled(Box)(({ theme }) => ({
	minHeight: "100vh",
	backgroundColor: theme.palette.background.default,
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
	padding: theme.spacing(3),
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(2),
	},
}));

const HeaderSection = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(4),
	display: "flex",
	justifyContent: "space-between",
	alignItems: "flex-start",
	gap: theme.spacing(2),
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
	},
}));

const HeaderLeft = styled(Box)({
	flex: 1,
	width: "100%",
});

const RepositoryTitle = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontSize: theme.custom.typography.fontSizes["4xl"],
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes["3xl"],
	},
}));

const MetadataContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(3),
	alignItems: "flex-start",
	flexWrap: "wrap",
	[theme.breakpoints.down("sm")]: {
		gap: theme.spacing(1.5),
		flexDirection: "column",
		width: "100%",
	},
}));

const MetadataText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
}));

const ArchitecturesBox = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(1),
	alignItems: "center",
	flexDirection: "row",
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		gap: theme.spacing(0.5),
		alignItems: "flex-start",
		flexDirection: "column",
		width: "100%",
	},
}));

const ArchitecturesLabel = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	marginRight: theme.spacing(1),
	[theme.breakpoints.down("sm")]: {
		marginRight: 0,
		marginBottom: 0,
	},
}));

const ChipsContainer = styled(Box)(({ theme }) => ({
	position: "relative",
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
	"&::before": {
		content: '""',
		position: "absolute",
		left: 0,
		top: 0,
		bottom: 0,
		width: 0,
		background: "none",
		pointerEvents: "none",
		zIndex: 1,
		[theme.breakpoints.down("sm")]: {
			width: theme.custom.spacing.fadeGradientWidth,
			background: `linear-gradient(to right, ${theme.custom.colors.background.default}, ${alpha(
				theme.custom.colors.background.default,
				0,
			)})`,
		},
	},
	"&::after": {
		content: '""',
		position: "absolute",
		right: 0,
		top: 0,
		bottom: 0,
		width: 0,
		background: "none",
		pointerEvents: "none",
		zIndex: 1,
		[theme.breakpoints.down("sm")]: {
			width: theme.custom.spacing.fadeGradientWidth,
			background: `linear-gradient(to left, ${theme.custom.colors.background.default}, ${alpha(
				theme.custom.colors.background.default,
				0,
			)})`,
		},
	},
}));

const DeleteButton = styled(IconButton)(({ theme }) => ({
	color: theme.custom.colors.semantic.error,
	alignSelf: "flex-start",
	"&:hover": {
		backgroundColor: theme.custom.colors.semantic.errorSubtle10,
		color: theme.custom.colors.semantic.errorSubtle,
	},
	[theme.breakpoints.down("sm")]: {
		alignSelf: "flex-end",
	},
}));

const FilterSection = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
	display: "flex",
	gap: theme.spacing(2),
	alignItems: "center",
	flexWrap: "wrap",
}));

const SortContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
	flexWrap: "wrap",
}));

const SortLabel = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	minWidth: "auto",
	[theme.breakpoints.up("sm")]: {
		minWidth: theme.custom.spacing.sortLabelMinWidth,
	},
}));

const ResultsCount = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	marginLeft: "auto",
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
}));

const TagCard = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
	padding: theme.spacing(3),
	backgroundColor: theme.palette.background.paper,
	borderRadius: theme.spacing(1),
	border: `1px solid ${theme.palette.divider}`,
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(2),
	},
}));

const TagHeader = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "space-between",
	paddingBottom: theme.spacing(2),
	gap: theme.spacing(1),
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: theme.spacing(2),
	},
}));

const TagHeaderLeft = styled(Box)(({ theme }) => ({
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
}));

const TagMetaContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
	marginBottom: theme.spacing(1),
	flexWrap: "wrap",
	[theme.breakpoints.down("sm")]: {
		gap: theme.spacing(1),
	},
}));

const TagName = styled(Typography)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.xxl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.lg,
	},
}));

const TagTimestamp = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.md,
	},
}));

const TagDeleteButton = styled(IconButton)(({ theme }) => ({
	color: theme.custom.colors.semantic.error,
	marginLeft: "auto",
	"&:hover": {
		backgroundColor: theme.custom.colors.semantic.errorSubtle10,
		color: theme.custom.colors.semantic.errorSubtle,
	},
	[theme.breakpoints.down("sm")]: {
		marginLeft: 0,
	},
}));

const DetailsCard = styled(Card)(({ theme }) => ({
	backgroundColor: "transparent",
	borderColor: theme.palette.divider,
	overflowX: "auto",
}));

const DetailsCardContent = styled(CardContent)(({ theme }) => ({
	padding: theme.spacing(2),
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(1),
	},
}));

const DigestText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.xl,
	color: theme.palette.primary.main,
	cursor: "pointer",
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.sm,
	},
}));

const CellText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontSize: theme.custom.typography.fontSizes.xl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.sm,
	},
}));

const getRelativeTime = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) return "just now";
	if (diffInSeconds < 3600)
		return `${Math.floor(diffInSeconds / 60)} minutes ago`;
	if (diffInSeconds < 86400)
		return `${Math.floor(diffInSeconds / 3600)} hours ago`;
	if (diffInSeconds < 604800)
		return `${Math.floor(diffInSeconds / 86400)} days ago`;
	if (diffInSeconds < 2592000)
		return `${Math.floor(diffInSeconds / 604800)} weeks ago`;
	if (diffInSeconds < 31536000)
		return `${Math.floor(diffInSeconds / 2592000)} months ago`;
	return `about ${Math.floor(diffInSeconds / 31536000)} years ago`;
};

function RepositoryPage() {
	const repositoryDisplayName = useMemo(() => mockRepository.name, []);

	const getDockerPullCommand = useCallback(
		(tagName: string) => {
			return `docker pull ${sourceHost}/${repositoryDisplayName}:${tagName}`;
		},
		[repositoryDisplayName],
	);

	return (
		<PageContainer>
			<ContentWrapper>
				{/* Breadcrumbs */}
				<Breadcrumbs sx={{ mb: 3 }}>
					<MuiLink color="primary" sx={{ cursor: "pointer" }}>
						Explore
					</MuiLink>
					{sourceHost && (
						<Typography color="text.secondary" variant="body2">
							{sourceHost}
						</Typography>
					)}
					<Typography color="text.primary">{mockRepository.name}</Typography>
				</Breadcrumbs>

				{/* Repository Header */}
				<HeaderSection>
					<HeaderLeft>
						<RepositoryTitle variant="h3" gutterBottom>
							{repositoryDisplayName}
						</RepositoryTitle>
						<MetadataContainer>
							<MetadataText variant="body1">
								{mockRepository.tagCount} tag
								{mockRepository.tagCount !== 1 ? "s" : ""} available
							</MetadataText>
							<MetadataText variant="body1">
								Total size: {mockRepository.totalSizeFormatted}
							</MetadataText>
							<ArchitecturesBox>
								<ArchitecturesLabel variant="body1">
									Architectures:
								</ArchitecturesLabel>
								<ChipsContainer>
									<Chip.ScrollList>
										{mockRepository.architectures.map((arch) => (
											<Chip
												key={arch}
												label={arch}
												size="medium"
												variant="solid"
											/>
										))}
									</Chip.ScrollList>
								</ChipsContainer>
							</ArchitecturesBox>
						</MetadataContainer>
					</HeaderLeft>
					<DeleteButton aria-label="Delete repository">
						<DeleteIcon />
					</DeleteButton>
				</HeaderSection>

				{/* Divider between general info and tags section */}
				<Divider sx={{ mb: 3 }} />

				{/* Tags Filter and Sort Section */}
				<FilterSection>
					{/* Sort by dropdown */}
					<SortContainer>
						<SortLabel variant="body2">Sort by</SortLabel>
						<FormControl size="small" sx={{ minWidth: 120 }}>
							<Select value={sortBy}>
								<MenuItem value="newest">Newest</MenuItem>
								<MenuItem value="oldest">Oldest</MenuItem>
								<MenuItem value="name">Name</MenuItem>
								<MenuItem value="size">Size</MenuItem>
							</Select>
						</FormControl>
					</SortContainer>

					{/* Filter tags input */}
					<TextField
						placeholder="Filter tags"
						value={filterQuery}
						size="small"
						sx={{
							flexGrow: 1,
							maxWidth: { xs: "100%", sm: 300 },
						}}
						InputProps={{
							startAdornment: (
								<InputAdornment position="start">
									<SearchIcon
										sx={(theme) => ({
											color: theme.palette.text.secondary,
											fontSize: theme.custom.typography.fontSizes.xl,
										})}
									/>
								</InputAdornment>
							),
						}}
					/>

					{/* Results count */}
					<ResultsCount variant="body2">
						{mockRepository.tags.length} of {mockRepository.tags.length} tags
					</ResultsCount>
				</FilterSection>

				{/* Tags Section */}
				<Box sx={{ bgcolor: "background.default" }}>
					{mockRepository.tags.map((tag) => (
						<TagCard key={tag.name}>
							{/* Tag Header */}
							<TagHeader>
								<TagHeaderLeft>
									<TagMetaContainer>
										<TagName variant="h6">{tag.name}</TagName>
										<TagTimestamp variant="body2">
											Last updated {getRelativeTime(tag.lastUpdated)}
										</TagTimestamp>
										<TagDeleteButton
											size="small"
											aria-label={`Delete tag ${tag.name}`}
										>
											<DeleteIcon fontSize="small" />
										</TagDeleteButton>
									</TagMetaContainer>
								</TagHeaderLeft>
								<CommandBox.Copyable
									aria-label={`Copy docker pull command for ${tag.name}`}
									title={`Click to copy: ${getDockerPullCommand(tag.name)}`}
								>
									<CommandBox.Copyable.Text variant="body2">
										{getDockerPullCommand(tag.name)}
									</CommandBox.Copyable.Text>
									<CommandBox.Copyable.Hint
										variant="body2"
										className="copy-hint"
									>
										Copy
									</CommandBox.Copyable.Hint>
								</CommandBox.Copyable>
							</TagHeader>

							{/* Tag Details Table */}
							<DetailsCard elevation={0} variant="outlined">
								<DetailsCardContent>
									<Table.Container>
										<Table size="small">
											<Table.Head>
												<Table.Row>
													<Table.HeaderCell>Digest</Table.HeaderCell>
													<Table.HeaderCell>OS/ARCH</Table.HeaderCell>
													<Table.HeaderCell>Size</Table.HeaderCell>
												</Table.Row>
											</Table.Head>
											<Table.Body>
												{tag.architectures.map((archInfo, archIndex) => (
													<Table.Row
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
														<Table.Cell>
															<DigestText
																variant="body2"
																title={archInfo.digest || "Unknown"}
															>
																{archInfo.digest
																	? archInfo.digest.substring(0, 12)
																	: "Unknown"}
															</DigestText>
														</Table.Cell>
														<Table.Cell>
															<CellText variant="body2">
																{archInfo.os}/{archInfo.architecture}
																{archInfo.variant ? `/${archInfo.variant}` : ""}
															</CellText>
														</Table.Cell>
														<Table.Cell>
															<CellText variant="body2">
																{archInfo.size}
															</CellText>
														</Table.Cell>
													</Table.Row>
												))}
											</Table.Body>
										</Table>
									</Table.Container>
								</DetailsCardContent>
							</DetailsCard>
						</TagCard>
					))}
				</Box>
			</ContentWrapper>
		</PageContainer>
	);
}

export default memo(RepositoryPage);
