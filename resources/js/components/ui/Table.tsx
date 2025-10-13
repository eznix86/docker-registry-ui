// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	Table as MuiTable,
	TableBody as MuiTableBody,
	TableCell as MuiTableCell,
	TableContainer as MuiTableContainer,
	TableHead as MuiTableHead,
	TableRow as MuiTableRow,
	styled,
} from "@mui/material";

const TableRoot = MuiTable;

const TableContainer = MuiTableContainer;

const TableHead = MuiTableHead;

const TableBody = MuiTableBody;

const TableRow = MuiTableRow;

const TableHeaderCell = styled(MuiTableCell)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontWeight: theme.custom.typography.fontWeights.bold,
	borderColor: theme.palette.divider,
	fontSize: theme.custom.typography.fontSizes.xl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.md,
	},
}));

const TableCell = styled(MuiTableCell)(({ theme }) => ({
	borderColor: theme.palette.divider,
}));

export const Table = Object.assign(TableRoot, {
	Container: TableContainer,
	Head: TableHead,
	Body: TableBody,
	Row: TableRow,
	HeaderCell: TableHeaderCell,
	Cell: TableCell,
});
