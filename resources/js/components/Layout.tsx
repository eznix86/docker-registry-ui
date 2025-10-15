// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
	AppBar,
	Box,
	IconButton,
	styled,
	Toolbar,
	Typography,
} from "@mui/material";
import { memo, type ReactNode, useCallback } from "react";
import Footer from "~/components/Footer";
import SearchInput from "~/components/SearchInput";

interface LayoutProps {
	children: ReactNode;
	onRefresh?: () => void;
}

const AppBarRoot = styled(AppBar)(({ theme }) => ({
	background: theme.custom.colors.background.gradient.primary,
	boxShadow: "none",
}));

const Logo = styled("img")({
	width: 24,
	height: 24,
	filter: "brightness(0) invert(1)",
});

const Title = styled(Typography)(({ theme }) => ({
	marginRight: theme.spacing(2),
	fontWeight: theme.custom.typography.fontWeights.black,
	color: "inherit",
	textDecoration: "none",
	fontFamily: theme.typography.fontFamily,
	[theme.breakpoints.down("sm")]: {
		display: "none",
	},
	"&:hover": {
		color: "inherit",
		textDecoration: "none",
	},
}));

const SearchContainer = styled(Box)(({ theme }) => ({
	flexGrow: 1,
	display: "flex",
	justifyContent: "center",
	alignItems: "center",
	position: "relative",
	[theme.breakpoints.up("sm")]: {
		marginLeft: 0,
		marginRight: 0,
	},
}));

const MainContent = styled(Box)({
	minHeight: "calc(100vh - 64px)",
});

const RefreshButton = styled(IconButton)(({ theme }) => ({
	color: theme.palette.common.white,
	[theme.breakpoints.up("sm")]: {
		marginLeft: 0,
	},
	[theme.breakpoints.down("sm")]: {
		marginLeft: theme.spacing(1),
	},
}));

function Layout({ children, onRefresh }: LayoutProps) {
	const handleRefresh = useCallback(() => {
		onRefresh?.();
	}, [onRefresh]);

	return (
		<Box sx={{ flexGrow: 1 }}>
			<AppBarRoot position="static">
				<Toolbar>
					<IconButton
						size="large"
						edge="start"
						color="inherit"
						aria-label="docker hub"
						sx={{ mr: { xs: 1, sm: 2 } }}
					>
						<Logo src="/public/container-hub.svg" alt="Container Hub" />
					</IconButton>
					<Title variant="h6" noWrap>
						ContainerHub
					</Title>
					<SearchContainer>
						<SearchInput />
					</SearchContainer>
					<RefreshButton
						size="large"
						aria-label="refresh repositories"
						onClick={handleRefresh}
					>
						<RefreshIcon />
					</RefreshButton>
				</Toolbar>
			</AppBarRoot>

			<MainContent>{children}</MainContent>
			<Footer />
		</Box>
	);
}

export default memo(Layout);
