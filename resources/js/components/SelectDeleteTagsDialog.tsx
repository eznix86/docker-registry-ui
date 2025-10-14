// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { usePage } from "@inertiajs/react";
import {
	Box,
	Button,
	Checkbox,
	FormControlLabel,
	styled,
	Typography,
} from "@mui/material";
import { memo, useCallback, useState } from "react";
import { Dialog } from "~/components/ui";
import { useDeleteTags } from "~/contexts/DeleteTagsContext";
import type { RepositoryProps } from "~/types";
import { formatBytes } from "~/utils";

const TagList = styled(Box)(({ theme }) => ({
	maxHeight: 400,
	overflowY: "auto",
	marginTop: theme.spacing(2),
	marginBottom: theme.spacing(2),
}));

const TagItem = styled(Box)(({ theme }) => ({
	padding: theme.spacing(1.5),
	marginBottom: theme.spacing(1),
	border: `1px solid ${theme.custom.colors.border.default}`,
	borderRadius: theme.shape.borderRadius,
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(2),
	"&:hover": {
		backgroundColor: theme.custom.colors.background.elevated,
	},
}));

const TagDetails = styled(Box)({
	flexGrow: 1,
});

const TagName = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.md,
	color: theme.palette.text.primary,
	fontWeight: theme.custom.typography.fontWeights.medium,
}));

const TagMeta = styled(Typography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.sm,
	color: theme.palette.text.secondary,
}));

function SelectDeleteTagsDialog() {
	const { tags = [] } = usePage().props as RepositoryProps;
	const { isSelectDialogOpen, closeSelectDialog } = useDeleteTags();
	const [selectedTagNames, setSelectedTagNames] = useState<Set<string>>(
		new Set(),
	);

	const handleToggle = useCallback((tagName: string) => {
		setSelectedTagNames((prev) => {
			const next = new Set(prev);
			if (next.has(tagName)) {
				next.delete(tagName);
			} else {
				next.add(tagName);
			}
			return next;
		});
	}, []);

	const handleSelectAll = useCallback(() => {
		if (selectedTagNames.size === tags.length) {
			setSelectedTagNames(new Set());
		} else {
			setSelectedTagNames(new Set(tags.map((tag) => tag.name)));
		}
	}, [selectedTagNames.size, tags]);

	const handleDelete = useCallback(() => {
		const tagsToDelete = tags.filter((tag) => selectedTagNames.has(tag.name));
		// TODO: Implement actual bulk delete logic
		console.log("Bulk deleting tags:", tagsToDelete);
		setSelectedTagNames(new Set());
		closeSelectDialog();
	}, [selectedTagNames, tags, closeSelectDialog]);

	const handleClose = useCallback(() => {
		setSelectedTagNames(new Set());
		closeSelectDialog();
	}, [closeSelectDialog]);

	const getTotalSize = (tag: (typeof tags)[0]) => {
		return tag.images.reduce((sum, img) => sum + (img.size || 0), 0);
	};

	return (
		<Dialog
			open={isSelectDialogOpen}
			maxWidth="md"
			fullWidth
			onClose={handleClose}
			disableRestoreFocus
		>
			<Dialog.Header sx={(theme) => ({ color: theme.palette.error.main })}>
				Select Tags to Delete
			</Dialog.Header>
			<Dialog.Body>
				<Typography
					variant="body1"
					sx={(theme) => ({
						fontSize: theme.custom.typography.fontSizes.md,
						color: theme.palette.text.secondary,
						mb: 2,
					})}
				>
					Select the tags you want to delete. This action cannot be undone.
				</Typography>

				<FormControlLabel
					control={
						<Checkbox
							checked={selectedTagNames.size === tags.length}
							indeterminate={
								selectedTagNames.size > 0 && selectedTagNames.size < tags.length
							}
							onChange={handleSelectAll}
						/>
					}
					label={
						<Typography variant="body2" fontWeight={600}>
							Select All ({tags.length} tags)
						</Typography>
					}
				/>

				<TagList>
					{tags.map((tag) => (
						<TagItem key={tag.name}>
							<Checkbox
								checked={selectedTagNames.has(tag.name)}
								onChange={() => handleToggle(tag.name)}
							/>
							<TagDetails>
								<TagName>{tag.name}</TagName>
								<TagMeta>
									{tag.images.length} image{tag.images.length > 1 ? "s" : ""} •{" "}
									{formatBytes(getTotalSize(tag))}
								</TagMeta>
							</TagDetails>
						</TagItem>
					))}
				</TagList>
			</Dialog.Body>
			<Dialog.Footer>
				<Button variant="outlined" onClick={handleClose}>
					Cancel
				</Button>
				<Button
					variant="contained"
					color="error"
					onClick={handleDelete}
					disabled={selectedTagNames.size === 0}
				>
					Delete {selectedTagNames.size > 0 && `(${selectedTagNames.size})`}
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}

export default memo(SelectDeleteTagsDialog);
