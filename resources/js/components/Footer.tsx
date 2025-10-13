// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, Box, Link, styled, Typography } from "@mui/material";
import { memo } from "react";
import Sparkles from "~/components/Sparkles";
import { useVersion } from "~/hooks/useVersion";

const VersionBadge = styled(Box)<{ hasUpdate: boolean }>(
	({ theme, hasUpdate }) => ({
		position: "fixed",
		right: theme.spacing(2),
		bottom: theme.spacing(2),
		padding: theme.spacing(1, 2),
		backgroundColor: alpha(
			theme.custom.colors.background.paper,
			hasUpdate ? 0.9 : 0.4,
		),
		border: `1px solid ${alpha(theme.custom.colors.border.default, hasUpdate ? 0.3 : 0.2)}`,
		borderRadius: theme.spacing(1),
		display: "flex",
		alignItems: "center",
		gap: theme.spacing(1.5),
		boxShadow: `0 4px 12px ${alpha(theme.palette.common.black, hasUpdate ? 0.3 : 0.1)}`,
		backdropFilter: "blur(10px)",
		zIndex: 1000,
		opacity: hasUpdate ? 1 : 0.5,
		transition: theme.custom.animations.transition.opacity,
		"&:hover": {
			opacity: 1,
		},
		[theme.breakpoints.down("sm")]: {
			padding: theme.spacing(0.75, 1.5),
			gap: theme.spacing(1),
			fontSize: theme.custom.typography.fontSizes.xs,
		},
	}),
);

const VersionText = styled(Typography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.sm,
	color: theme.custom.colors.text.tertiary,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.xs,
	},
}));

const NewVersionLink = styled(Link)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.sm,
	color: theme.custom.colors.primary.main,
	textDecoration: "none",
	transition: theme.custom.animations.transition.fast,
	"&:hover": {
		textDecoration: "underline",
		color: theme.custom.colors.primary.light,
	},
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.xs,
	},
}));

const Separator = styled("span")(({ theme }) => ({
	color: theme.custom.colors.border.default,
}));

function Footer() {
	const {
		currentVersion,
		latestVersion,
		hasNewVersion,
		releaseUrl,
		isLoading,
	} = useVersion();

	if (isLoading) {
		return null;
	}

	return (
		<VersionBadge hasUpdate={hasNewVersion}>
			<VersionText>v{currentVersion}</VersionText>

			{hasNewVersion && latestVersion && releaseUrl && (
				<>
					<Separator>•</Separator>
					<Sparkles>
						<NewVersionLink
							href={releaseUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							{latestVersion} available
						</NewVersionLink>
					</Sparkles>
				</>
			)}
		</VersionBadge>
	);
}

export default memo(Footer);
