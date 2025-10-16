// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { styled, Typography } from "@mui/material";
import { memo } from "react";
import { useRepository, useTags } from "~/stores/pagePropsStore";

const ResultsCount = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	marginLeft: "auto",
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
}));

function RepositoryResultCount() {
	const repository = useRepository();
	const tags = useTags();

	return (
		<ResultsCount variant="body2">
			{tags.data.length} of {repository?.tagsCount} tags
		</ResultsCount>
	);
}

export default memo(RepositoryResultCount);
