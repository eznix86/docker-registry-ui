// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Link } from "@inertiajs/react";

import { Breadcrumbs, Link as MuiLink, Typography } from "@mui/material";
import { memo } from "react";
import { useRepository } from "~/stores/pagePropsStore";
import { getDisplayName } from "~/utils";

function RepositoryBreadcrumbs() {
	const repository = useRepository();

	return (
		<Breadcrumbs sx={{ mb: 3 }}>
			<Link href="/" as={"div"} prefetch={["hover"]}>
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
