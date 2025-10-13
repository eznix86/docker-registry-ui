// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	DialogActions,
	DialogContent,
	DialogTitle,
	Dialog as MuiDialog,
	styled,
} from "@mui/material";

const DialogRoot = styled(MuiDialog)(({ theme }) => ({
	"& .MuiPaper-root": {
		backgroundColor: theme.palette.background.paper,
		borderRadius: theme.spacing(1.5),
		border: `1px solid ${theme.palette.divider}`,
		backgroundImage: "none",
	},
}));

const DialogHeader = styled(DialogTitle)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontWeight: theme.custom.typography.fontWeights.semibold,
	fontSize: theme.custom.typography.fontSizes["2xl"],
	padding: theme.spacing(2.5),
	borderBottom: `1px solid ${theme.palette.divider}`,
}));

const DialogBody = styled(DialogContent)(({ theme }) => ({
	padding: theme.spacing(2.5),
	paddingTop: theme.spacing(2.5),
	"& > :first-child": {
		marginTop: theme.spacing(2.5),
	},
}));

const DialogFooter = styled(DialogActions)(({ theme }) => ({
	padding: theme.spacing(2.5),
	borderTop: `1px solid ${theme.palette.divider}`,
	justifyContent: "flex-end",
}));

export const Dialog = Object.assign(DialogRoot, {
	Header: DialogHeader,
	Body: DialogBody,
	Footer: DialogFooter,
});
