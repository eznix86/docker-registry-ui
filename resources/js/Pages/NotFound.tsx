// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Link } from "@inertiajs/react";
import { SearchOff as SearchOffIcon } from "@mui/icons-material";
import { Box, Button, styled, Typography } from "@mui/material";
import { memo } from "react";

const Container = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "column",
	alignItems: "center",
	justifyContent: "center",
	minHeight: "calc(100vh - 64px)",
	padding: theme.spacing(4),
	textAlign: "center",
}));

const Icon = styled(SearchOffIcon)(({ theme }) => ({
	fontSize: 120,
	color: theme.palette.text.disabled,
	marginBottom: theme.spacing(3),
}));

const Title = styled(Typography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes["4xl"],
	fontWeight: theme.custom.typography.fontWeights.bold,
	color: theme.palette.text.primary,
	marginBottom: theme.spacing(2),
}));

const Message = styled(Typography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.lg,
	color: theme.palette.text.secondary,
	maxWidth: 500,
	marginBottom: theme.spacing(4),
}));

function NotFound() {
	return (
		<Container>
			<Icon />
			<Title>404 - Page Not Found</Title>
			<Message>
				The page you're looking for doesn't exist. It might have been moved or
				deleted, or you may have mistyped the URL.
			</Message>
			<Link href="/" style={{ textDecoration: "none" }}>
				<Button variant="contained" size="large">
					Go to Home
				</Button>
			</Link>
		</Container>
	);
}

export default memo(NotFound);
