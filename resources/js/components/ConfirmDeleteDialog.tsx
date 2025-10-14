// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, Button, Typography } from "@mui/material";
import { memo, useCallback } from "react";
import { Dialog } from "~/components/ui";
import { useDeleteTags } from "~/contexts/DeleteTagsContext";
import { formatBytes } from "~/utils";

function ConfirmDeleteDialog() {
	const { isConfirmDialogOpen, selectedTag, closeConfirmDialog } =
		useDeleteTags();

	const handleDelete = useCallback(() => {
		// TODO: Implement actual delete logic
		console.log("Deleting tag:", selectedTag);
		closeConfirmDialog();
	}, [selectedTag, closeConfirmDialog]);

	if (!selectedTag) return null;

	const totalSize = selectedTag.images.reduce(
		(sum, img) => sum + (img.size || 0),
		0,
	);

	return (
		<Dialog
			open={isConfirmDialogOpen}
			maxWidth="md"
			fullWidth
			onClose={closeConfirmDialog}
			disableRestoreFocus
		>
			<Dialog.Header sx={(theme) => ({ color: theme.palette.error.main })}>
				Confirm Delete
			</Dialog.Header>
			<Dialog.Body>
				<Box sx={{ mb: 3 }}>
					<Typography
						variant="body1"
						sx={(theme) => ({
							fontSize: theme.custom.typography.fontSizes.lg,
							color: theme.palette.text.primary,
							fontWeight: theme.custom.typography.fontWeights.medium,
							mb: 2,
						})}
					>
						You are about to delete tag <strong>{selectedTag.name}</strong> (
						{formatBytes(totalSize)}). This action cannot be undone.
					</Typography>

					<Typography
						variant="body2"
						sx={(theme) => ({
							fontSize: theme.custom.typography.fontSizes.md,
							color: theme.palette.text.secondary,
							mb: 2,
						})}
					>
						This tag contains {selectedTag.images.length} image
						{selectedTag.images.length > 1 ? "s" : ""}.
					</Typography>
				</Box>
			</Dialog.Body>
			<Dialog.Footer>
				<Button variant="outlined" onClick={closeConfirmDialog}>
					Cancel
				</Button>
				<Button variant="contained" color="error" onClick={handleDelete}>
					Delete Tag
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}

export default memo(ConfirmDeleteDialog);
