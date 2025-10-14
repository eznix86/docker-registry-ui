// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Link, usePage } from "@inertiajs/react";

import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { memo } from "react";
import type { RepositoryProps } from "~/types";
import { getDisplayName } from "~/utils";

function RepositoryBreadcrumbs() {
	const { repository } = usePage().props as RepositoryProps;

	return (
		<Breadcrumbs sx={{ mb: 3 }}>
			<Link href="/" as={"div"}>
				<MuiLink color="primary" sx={{ cursor: "pointer" }}>
					Explore
				</MuiLink>
			</Link>
			<Typography color="text.secondary">{repository?.registry}</Typography>
			<Typography color="text.primary">
				{repository && getDisplayName(repository)}
			</Typography>
		</Breadcrumbs>
	);
}

export default memo(RepositoryBreadcrumbs);
