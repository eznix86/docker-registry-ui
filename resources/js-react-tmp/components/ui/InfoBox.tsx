// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box as MuiBox, styled, Typography } from "@mui/material"

const InfoBoxRoot = styled(MuiBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.default,
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.spacing(1),
	padding: theme.spacing(2),
}))

const InfoBoxTitle = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontWeight: theme.custom.typography.fontWeights.semibold,
	fontSize: theme.custom.typography.fontSizes.xl,
	marginBottom: theme.spacing(1),
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
}))

const InfoBoxText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
	lineHeight: theme.custom.lineHeights.relaxed,
	marginBottom: theme.spacing(1),
}))

export const InfoBox = Object.assign(InfoBoxRoot, {
	Title: InfoBoxTitle,
	Text: InfoBoxText,
})

const WarningBoxRoot = styled(MuiBox)(({ theme }) => ({
	backgroundColor: theme.palette.background.default,
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.spacing(1),
	padding: theme.spacing(2),
	marginBottom: theme.spacing(2),
}))

const WarningBoxTitle = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontWeight: theme.custom.typography.fontWeights.semibold,
	fontSize: theme.custom.typography.fontSizes.xl,
	marginBottom: theme.spacing(1.5),
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
}))

const WarningBoxText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
	lineHeight: theme.custom.lineHeights.relaxed,
	marginBottom: theme.spacing(1),
}))

export const WarningBox = Object.assign(WarningBoxRoot, {
	Title: WarningBoxTitle,
	Text: WarningBoxText,
})
