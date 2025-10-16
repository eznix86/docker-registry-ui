// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, Divider, styled } from "@mui/material";
import { memo } from "react";
import ConfirmDeleteDialog from "~/components/ConfirmDeleteDialog";
import RepositoryBreadcrumbs from "~/components/RepositoryBreadcrumbs";
import RepositoryHeader from "~/components/RepositoryHeader";
import RepositoryResultsCount from "~/components/RepositoryResultsCount";
import RepositorySearchFilter from "~/components/RepositorySearchFilter";
import RepositorySortBy from "~/components/RepositorySortBy";
import RepositoryTagList from "~/components/RepositoryTagList";
import SelectDeleteTagsDialog from "~/components/SelectDeleteTagsDialog";

// Styled Components
const PageContainer = styled(Box)(({ theme }) => ({
	minHeight: "100vh",
	backgroundColor: theme.palette.background.default,
}));

const ContentWrapper = styled(Box)(({ theme }) => ({
	padding: theme.spacing(3),
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(2),
	},
}));

const FilterSection = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
	display: "flex",
	gap: theme.spacing(2),
	alignItems: "center",
	flexWrap: "wrap",
}));

function RepositoryPage() {
	return (
		<PageContainer>
			<ContentWrapper>
				{/* Breadcrumbs */}
				<RepositoryBreadcrumbs />

				{/* Repository Header */}
				<RepositoryHeader />

				{/* Divider between general info and tags section */}
				<Divider sx={{ mb: 3 }} />

				{/* Tags Filter and Sort Section */}
				<FilterSection>
					<RepositorySortBy />
					<RepositorySearchFilter />
					<RepositoryResultsCount />
				</FilterSection>

				{/* Tags Section */}
				<RepositoryTagList />
			</ContentWrapper>

			{/* Delete Dialogs */}
			<SelectDeleteTagsDialog />
			<ConfirmDeleteDialog />
		</PageContainer>
	);
}

export default memo(RepositoryPage);
