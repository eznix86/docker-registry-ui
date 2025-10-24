// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import type { Repository } from "~/types"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import { InfiniteScroll } from "@inertiajs/react"
import { Delete as DeleteIcon } from "@mui/icons-material"
import {
	Box,
	Card,
	CardContent,
	IconButton,
	styled,
	Typography,
} from "@mui/material"
import RepositoryImageItem from "~/components/RepositoryImageItem"
import { CommandBox, Table } from "~/components/ui"
import { useOpenConfirmDialog } from "~/stores/deleteTagsStore"
import { useRepository, useTags } from "~/stores/pagePropsStore"
import { getRelativeTime, pullCommand } from "~/utils"

const TagCard = styled(Box)(({ theme }) => ({
	marginBottom: theme.spacing(3),
	padding: theme.spacing(3),
	backgroundColor: theme.palette.background.paper,
	borderRadius: theme.spacing(1),
	border: `1px solid ${theme.palette.divider}`,
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(2),
	},
}))

const TagHeader = styled(Box)(({ theme }) => ({
	display: "flex",
	flexDirection: "row",
	alignItems: "center",
	justifyContent: "space-between",
	paddingBottom: theme.spacing(2),
	gap: theme.spacing(1),
	[theme.breakpoints.down("sm")]: {
		flexDirection: "column",
		alignItems: "flex-start",
		gap: theme.spacing(2),
	},
}))

const TagHeaderLeft = styled(Box)(({ theme }) => ({
	width: "auto",
	[theme.breakpoints.down("sm")]: {
		width: "100%",
	},
}))

const TagMetaContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
	marginBottom: theme.spacing(1),
	flexWrap: "wrap",
	[theme.breakpoints.down("sm")]: {
		gap: theme.spacing(1),
	},
}))

const TagName = styled(Typography)(({ theme }) => ({
	color: theme.palette.primary.main,
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.xxl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.lg,
	},
}))

const TagTimestamp = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.md,
	},
}))

const TagDeleteButton = styled(IconButton)(({ theme }) => ({
	"color": theme.custom.colors.semantic.error,
	"marginLeft": "auto",
	"&:hover": {
		backgroundColor: theme.custom.colors.semantic.errorSubtle10,
		color: theme.custom.colors.semantic.errorSubtle,
	},
	[theme.breakpoints.down("sm")]: {
		marginLeft: 0,
	},
}))

const DetailsCard = styled(Card)(({ theme }) => ({
	backgroundColor: "transparent",
	borderColor: theme.palette.divider,
	overflowX: "auto",
}))

const DetailsCardContent = styled(CardContent)(({ theme }) => ({
	padding: theme.spacing(2),
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(1),
	},
}))

function RepositoryTagList() {
	const repository = useRepository()
	const tags = useTags()
	const openConfirmDialog = useOpenConfirmDialog()
	const [parent] = useAutoAnimate({
		duration: 200,
		easing: "ease-in-out",
	})

	return (
		<Box ref={parent} sx={{ bgcolor: "background.default" }}>
			<InfiniteScroll data="tags" buffer={500}>
				{tags.data?.map(tag => (
					<TagCard key={`${tag.name}-${tag.digest}`}>
						{/* Tag Header */}
						<TagHeader>
							<TagHeaderLeft>
								<TagMetaContainer>
									<TagName variant="h6">{tag.name}</TagName>
									<TagTimestamp variant="body2">
										Last updated
										{" "}
										{getRelativeTime(tag.createdAt)}
									</TagTimestamp>
									<TagDeleteButton
										size="small"
										aria-label={`Delete tag ${tag.name}`}
										onClick={() => openConfirmDialog(tag)}
									>
										<DeleteIcon fontSize="small" />
									</TagDeleteButton>
								</TagMetaContainer>
							</TagHeaderLeft>
							<CommandBox.Copyable
								copyableText={pullCommand(repository as Repository, tag.name)}
								aria-label={`Copy docker pull command for ${tag.name}`}
								title={`Click to copy: ${pullCommand(repository as Repository, tag.name)}`}
							>
								<CommandBox.Copyable.Text variant="body2">
									{pullCommand(repository as Repository, tag.name)}
								</CommandBox.Copyable.Text>
								<CommandBox.Copyable.Hint variant="body2" className="copy-hint">
									Copy
								</CommandBox.Copyable.Hint>
							</CommandBox.Copyable>
						</TagHeader>

						{/* Tag Details Table */}
						<DetailsCard elevation={0} variant="outlined">
							<DetailsCardContent>
								<Table.Container>
									<Table size="small">
										<Table.Head>
											<Table.Row>
												<Table.HeaderCell>Digest</Table.HeaderCell>
												<Table.HeaderCell>OS/ARCH</Table.HeaderCell>
												<Table.HeaderCell>Size</Table.HeaderCell>
											</Table.Row>
										</Table.Head>
										<Table.Body>
											{tag?.images?.map((image, index) => (
												<RepositoryImageItem
													key={`${image.digest}-${image.os}-${image.architecture}-${image.variant}`}
													image={image}
													last={index === tag.images.length - 1}
												/>
											))}
										</Table.Body>
									</Table>
								</Table.Container>
							</DetailsCardContent>
						</DetailsCard>
					</TagCard>
				))}
			</InfiniteScroll>
		</Box>
	)
}

RepositoryTagList.displayName = "RepositoryTagList"

export default RepositoryTagList
