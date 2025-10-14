// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { usePage } from "@inertiajs/react";
import { styled, Typography } from "@mui/material";
import { memo } from "react";
import type { RepositoryProps } from "~/types";

const ResultsCount = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	marginLeft: "auto",
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
}));

function RepositoryResultCount() {
	const { repository, tags = [] } = usePage().props as RepositoryProps;
	return (
		<ResultsCount variant="body2">
			{tags.length} of {repository?.tagsCount} tags
		</ResultsCount>
	);
}

export default memo(RepositoryResultCount);
