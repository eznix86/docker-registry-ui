import {
	FilterList as FilterListIcon,
} from "@mui/icons-material";
import {
	Box,
	Button,
	Typography,
	CircularProgress,
	SwipeableDrawer,
	IconButton,
	useMediaQuery,
	useTheme,
	styled,
} from "@mui/material";
import { useState, useCallback, memo } from "react";
import ArchitecturesFilter from "./components/ArchitecturesFilter";
import RepositoryCardList from "./components/RepositoryCardList";
import ShowUntaggedFilter from "./components/ShowUntaggedFilter";
import SourcesFilter from "./components/SourcesFilter";
import type { RepositoryMeta } from "./components/RepositoryCard";
import { Dialog, InfoBox, WarningBox, CommandBox, FilterTitle } from "./components/ui";

// Static mock data
const mockRepositories: RepositoryMeta[] = [
	{
		name: "busybox",
		source: "local-registry",
		tagCount: 1,
		architectures: ["amd64", "armv5", "arm/v6", "arm/v7", "arm64/v8", "386", "ppc64le", "riscv64", "s390x"],
		totalSizeFormatted: "16.46 MB",
	},
	{
		name: "nginx",
		namespace: "library",
		source: "docker-hub",
		tagCount: 156,
		architectures: ["amd64", "arm64", "arm/v7", "386"],
		totalSizeFormatted: "245 MB",
	},
	{
		name: "postgres",
		namespace: "library",
		source: "docker-hub",
		tagCount: 89,
		architectures: ["amd64", "arm64"],
		totalSizeFormatted: "412 MB",
	},
	{
		name: "redis",
		namespace: "library",
		source: "docker-hub",
		tagCount: 124,
		architectures: ["amd64", "arm64", "arm/v7", "386", "ppc64le"],
		totalSizeFormatted: "178 MB",
	},
	{
		name: "alpine",
		source: "local-registry",
		tagCount: 45,
		architectures: ["amd64", "arm64", "arm/v6", "arm/v7", "386", "ppc64le", "s390x"],
		totalSizeFormatted: "89 MB",
	},
	{
		name: "my-app",
		namespace: "myorg",
		source: "local-registry",
		tagCount: 12,
		architectures: ["amd64"],
		totalSizeFormatted: "523 MB",
	},
	{
		name: "old-build",
		namespace: "legacy",
		source: "local-registry",
		tagCount: 0,
		architectures: [],
		totalSizeFormatted: "0 B",
	},
];

const mockSources = [
	{ key: "local-registry", host: "registry.brunobernard.dev" },
	{ key: "docker-hub", host: "registry.hub.docker.com" },
];

// Styled Components
const Container = styled(Box)(({ theme }) => ({
	backgroundColor: theme.palette.background.default,
	height: "calc(100vh - 64px)",
	display: "flex",
	flexDirection: "row",
	overflow: "hidden",
}));

const Sidebar = styled(Box)(({ theme }) => ({
	width: 320,
	minWidth: 320,
	maxWidth: 320,
	height: "100%",
	flexShrink: 0,
	padding: theme.spacing(4),
	backgroundColor: theme.palette.background.default,
	overflowY: "auto",
}));

const MainContent = styled(Box)(({ theme }) => ({
	flexGrow: 1,
	padding: theme.spacing(4),
	overflowY: "auto",
	height: "100%",
	[theme.breakpoints.down("md")]: {
		padding: theme.spacing(2),
	},
}));

const FilterSection = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
}));

const HeaderContainer = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
}));

const HeaderLeft = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(2),
	alignItems: "center",
}));

const ResultsText = styled(Typography)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
}));

const MobileFilterButton = styled(IconButton)(({ theme }) => ({
	color: theme.palette.primary.main,
	border: "1px solid",
	borderColor: theme.palette.divider,
}));

const DrawerPaper = styled(Box)(({ theme }) => ({
	width: 280,
	padding: theme.spacing(3),
	backgroundColor: theme.palette.background.default,
}));

const FilterContent = memo(() => {
	return (
		<>
			<FilterTitle variant="h6">Filter by</FilterTitle>

			<FilterSection>
				<SourcesFilter sources={mockSources} selected={["registry.brunobernard.dev"]} />
			</FilterSection>

			<FilterSection>
				<ArchitecturesFilter />
			</FilterSection>

			<FilterSection>
				<ShowUntaggedFilter checked={true} />
			</FilterSection>
		</>
	);
});

FilterContent.displayName = "FilterContent";

function ExplorePage() {
	const untaggedDialogOpen = false;
	const untaggedRepositoryName = "example/untagged-repo";
	const loading = false;

	const [drawerOpen, setDrawerOpen] = useState(false);
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const handleUntaggedClick = useCallback((repo: RepositoryMeta) => {
		console.log("Clicked untagged repo:", repo);
	}, []);

	const handleDrawerOpen = useCallback(() => {
		setDrawerOpen(true);
	}, []);

	const handleDrawerClose = useCallback(() => {
		setDrawerOpen(false);
	}, []);

	return (
		<Container>
			{/* Desktop Sidebar */}
			{!isMobile && (
				<Sidebar>
					<FilterContent />
				</Sidebar>
			)}

			{/* Mobile Drawer */}
			<SwipeableDrawer
				anchor="left"
				open={drawerOpen}
				onClose={handleDrawerClose}
				onOpen={handleDrawerOpen}
				sx={{
					display: { xs: "block", md: "none" },
				}}
				PaperProps={{
					component: DrawerPaper,
				}}
			>
				<FilterContent />
			</SwipeableDrawer>

			<MainContent>
				<HeaderContainer>
					<HeaderLeft>
						{/* Mobile Filter Button */}
						{isMobile && (
							<MobileFilterButton
								onClick={handleDrawerOpen}
								aria-label="Open filters"
							>
								<FilterListIcon />
							</MobileFilterButton>
						)}
						<ResultsText variant="body2" color="text.secondary">
							{mockRepositories.length} of {mockRepositories.length} available
							results.
							{loading && <CircularProgress size={16} />}
						</ResultsText>
					</HeaderLeft>
				</HeaderContainer>

				{/* Repository Cards */}
				<RepositoryCardList
					repositories={mockRepositories}
					onUntaggedClick={handleUntaggedClick}
					sourceHost="registry.brunobernard.dev"
				/>
			</MainContent>

			{/* Untagged Repository Dialog */}
			<Dialog open={untaggedDialogOpen} maxWidth="md" fullWidth>
				<Dialog.Header>Untagged Repository</Dialog.Header>
				<Dialog.Body>
					<WarningBox>
						<WarningBox.Text>
							This repository exists in the registry but contains no tagged images.
							Repositories without tags cannot be pulled or accessed through standard Docker commands.
						</WarningBox.Text>
					</WarningBox>

					<WarningBox>
						<WarningBox.Title>
							Cleanup Instructions
						</WarningBox.Title>
						<WarningBox.Text>
							To remove this repository from the filesystem, execute the following command:
						</WarningBox.Text>

						<CommandBox>
							<CommandBox.Text>
								rm -rf /var/lib/registry/docker/registry/v2/repositories/
								{untaggedRepositoryName}
							</CommandBox.Text>
						</CommandBox>
					</WarningBox>

					<InfoBox>
						<InfoBox.Title>
							Additional Information
						</InfoBox.Title>
						<WarningBox.Text>
							After removing repositories, run garbage collection to reclaim storage space:
						</WarningBox.Text>

						<CommandBox>
							<CommandBox.Text>
								registry garbage-collect /path/to/config.yml
							</CommandBox.Text>
						</CommandBox>
					</InfoBox>
				</Dialog.Body>
				<Dialog.Footer>
					<Button variant="contained" autoFocus>
						Close
					</Button>
				</Dialog.Footer>
			</Dialog>
		</Container>
	);
}

export default memo(ExplorePage);
