// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Delete as DeleteIcon } from "@mui/icons-material";
import { alpha, Box, IconButton, styled, Typography } from "@mui/material";
import { memo } from "react";
import { Chip } from "~/components/ui";
import { useOpenSelectDialog } from "~/stores/deleteTagsStore";
import { useRepository } from "~/stores/pagePropsStore";
import { formatBytes, getDisplayName } from "~/utils";

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

function RepositoryHeader() {
	const repository = useRepository();
	const openSelectDialog = useOpenSelectDialog();

	return (
		<HeaderSection>
			<HeaderLeft>
				<RepositoryTitle variant="h3" gutterBottom>
					{repository && getDisplayName(repository)}
				</RepositoryTitle>
				<MetadataContainer>
					<MetadataText variant="body1">
						{repository?.tagsCount} tag
						{repository?.tagsCount !== 1 ? "s" : ""} available
					</MetadataText>
					<MetadataText variant="body1">
						Total size: {formatBytes(repository?.totalSizeInBytes || 0)}
					</MetadataText>
					<ArchitecturesBox>
						<ArchitecturesLabel variant="body1">
							Architectures:
						</ArchitecturesLabel>
						<ChipsContainer>
							<Chip.ScrollList>
								{repository?.architectures?.map((arch) => (
									<Chip key={arch} label={arch} size="medium" variant="solid" />
								))}
							</Chip.ScrollList>
						</ChipsContainer>
					</ArchitecturesBox>
				</MetadataContainer>
			</HeaderLeft>
			<DeleteButton aria-label="Delete repository" onClick={openSelectDialog}>
				<DeleteIcon />
			</DeleteButton>
		</HeaderSection>
	);
}

export default memo(RepositoryHeader);
