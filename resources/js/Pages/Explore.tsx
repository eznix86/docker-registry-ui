// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	FilterList as FilterListIcon,
	Settings as SettingsIcon,
} from "@mui/icons-material";
import {
	Box,
	IconButton,
	SwipeableDrawer,
	styled,
	useMediaQuery,
	useTheme,
} from "@mui/material";
import { memo, useCallback, useMemo, useState } from "react";
import ArchitecturesFilter from "~/components/ArchitecturesFilter";
import ExploreStatusAvailable from "~/components/ExploreStatusAvailable";
import RegistryFilter from "~/components/RegistryFilter";
import RepositoryCardList from "~/components/RepositoryCardList";
import ShowUntaggedFilter from "~/components/ShowUntaggedFilter";
import UntagDialog from "~/components/UntagDialog";
import { FilterTitle, FormControlLabel, Label } from "~/components/ui";
import { useOpenSettings } from "~/stores/themeStore";

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
	display: "flex",
	flexDirection: "column",
}));

const FilterContentWrapper = styled(Box)({
	flexGrow: 1,
});

const SettingsButtonContainer = styled(Box)(({ theme }) => ({
	marginTop: theme.spacing(2),
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

interface FilterContentProps {
	showSettings?: boolean;
}

const FilterContent = memo(({ showSettings = false }: FilterContentProps) => {
	const openSettings = useOpenSettings();

	return (
		<>
			<FilterContentWrapper>
				<FilterTitle variant="h1">Filter by</FilterTitle>

				<FilterSection>
					<RegistryFilter />
				</FilterSection>

				<FilterSection>
					<ArchitecturesFilter />
				</FilterSection>

				<FilterSection>
					<ShowUntaggedFilter />
				</FilterSection>
			</FilterContentWrapper>

			{showSettings && (
				<SettingsButtonContainer>
					<FormControlLabel
						control={
							<IconButton
								size="small"
								onClick={openSettings}
								aria-label="Settings"
								sx={{ p: 0, mr: 1 }}
							>
								<SettingsIcon fontSize="small" />
							</IconButton>
						}
						label={<Label variant="body2">Settings</Label>}
					/>
				</SettingsButtonContainer>
			)}
		</>
	);
});

FilterContent.displayName = "FilterContent";

function ExplorePage() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const theme = useTheme();
	const isMobile = useMediaQuery(theme.breakpoints.down("md"));

	const handleDrawerOpen = useCallback(() => {
		setDrawerOpen(true);
	}, []);

	const handleDrawerClose = useCallback(() => {
		setDrawerOpen(false);
	}, []);

	const drawerSx = useMemo(
		() => ({
			display: { xs: "block", md: "none" },
		}),
		[],
	);

	const drawerPaperProps = useMemo(
		() => ({
			component: DrawerPaper,
		}),
		[],
	);

	return (
		<Container>
			{/* Desktop Sidebar */}
			{!isMobile && (
				<Sidebar>
					<FilterContent showSettings />
				</Sidebar>
			)}
			{/* Mobile Drawer */}
			<SwipeableDrawer
				anchor="left"
				open={drawerOpen}
				onClose={handleDrawerClose}
				onOpen={handleDrawerOpen}
				sx={drawerSx}
				slotProps={{
					paper: drawerPaperProps,
				}}
			>
				<FilterContent showSettings />
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
						<ExploreStatusAvailable />
					</HeaderLeft>
				</HeaderContainer>

				{/* Repository Cards */}
				<RepositoryCardList />
			</MainContent>
			<UntagDialog />
		</Container>
	);
}

export default memo(ExplorePage);
