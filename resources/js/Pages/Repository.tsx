// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Search as SearchIcon } from "@mui/icons-material";
import {
	Box,
	Divider,
	FormControl,
	InputAdornment,
	styled,
	Typography,
} from "@mui/material";
import { memo } from "react";
import ConfirmDeleteDialog from "~/components/ConfirmDeleteDialog";
import RepositoryBreadcrumbs from "~/components/RepositoryBreadcrumbs";
import RepositoryHeader from "~/components/RepositoryHeader";
import RepositoryResultsCount from "~/components/RepositoryResultsCount";
import RepositoryTagList from "~/components/RepositoryTagList";
import SelectDeleteTagsDialog from "~/components/SelectDeleteTagsDialog";
import { MenuItem, Select, TextField } from "~/components/ui";
import { DeleteTagsProvider } from "~/contexts/DeleteTagsContext";

const sortBy = "newest";
const filterQuery = "";

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

const SortContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(1),
	flexWrap: "wrap",
}));

const SortLabel = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	minWidth: "auto",
	[theme.breakpoints.up("sm")]: {
		minWidth: theme.custom.spacing.sortLabelMinWidth,
	},
}));

function RepositoryPage() {
	return (
		<DeleteTagsProvider>
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
						{/* Sort by dropdown */}
						<SortContainer>
							<SortLabel variant="body2">Sort by</SortLabel>
							<FormControl size="small" sx={{ minWidth: 120 }}>
								<Select value={sortBy}>
									<MenuItem value="newest">Newest</MenuItem>
									<MenuItem value="oldest">Oldest</MenuItem>
									<MenuItem value="name">Name</MenuItem>
									<MenuItem value="size">Size</MenuItem>
								</Select>
							</FormControl>
						</SortContainer>

						{/* Filter tags input */}
						<TextField
							placeholder="Filter tags"
							value={filterQuery}
							size="small"
							sx={{
								flexGrow: 1,
								maxWidth: { xs: "100%", sm: 300 },
							}}
							slotProps={{
								input: {
									startAdornment: (
										<InputAdornment position="start">
											<SearchIcon
												sx={(theme) => ({
													color: theme.palette.text.secondary,
													fontSize: theme.custom.typography.fontSizes.xl,
												})}
											/>
										</InputAdornment>
									),
								},
							}}
						/>

						{/* Results count */}
						<RepositoryResultsCount />
					</FilterSection>

					{/* Tags Section */}
					<RepositoryTagList />
				</ContentWrapper>

				{/* Delete Dialogs */}
				<SelectDeleteTagsDialog />
				<ConfirmDeleteDialog />
			</PageContainer>
		</DeleteTagsProvider>
	);
}

export default memo(RepositoryPage);
