import { CheckBox, CheckBoxOutlineBlank } from "@mui/icons-material";
import {
	Alert,
	Box,
	Button,
	Checkbox,
	CircularProgress,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControlLabel,
	FormGroup,
	Typography,
} from "@mui/material";
import { useState } from "react";
import type { ArchitectureInfo, Tag } from "../store/repositoryStore";
import { useRepositoryStore } from "../store/repositoryStore";
import { useSnackbarStore } from "../store/snackbarStore";

interface SelectiveDeleteDialogProps {
	open: boolean;
	onClose: () => void;
	repositoryName: string;
	repositoryKey: string;
	tags: Tag[];
}

export function SelectiveDeleteDialog({
	open,
	onClose,
	repositoryName,
	repositoryKey,
	tags,
}: SelectiveDeleteDialogProps) {
	const [selectedImages, setSelectedImages] = useState<Set<string>>(new Set());
	const [isDeleting, setIsDeleting] = useState(false);

	const { deleteRepository, deleteTag } = useRepositoryStore();
	const { showSnackbar } = useSnackbarStore();

	const allImages = tags.flatMap((tag) =>
		tag.architectures.map((arch) => `${tag.name}:${arch.digest}`),
	);

	const handleImageToggle = (imageId: string) => {
		const newSelected = new Set(selectedImages);
		if (newSelected.has(imageId)) {
			newSelected.delete(imageId);
		} else {
			newSelected.add(imageId);
		}
		setSelectedImages(newSelected);
	};

	const handleSelectAll = () => {
		if (selectedImages.size === allImages.length) {
			setSelectedImages(new Set());
		} else {
			setSelectedImages(new Set(allImages));
		}
	};

	const handleConfirm = async () => {
		if (selectedImages.size === 0) return;

		setIsDeleting(true);

		try {
			if (selectedImages.size === allImages.length) {
				const [namespace, name] = repositoryKey.includes("/")
					? repositoryKey.split("/", 2)
					: [undefined, repositoryKey];

				const success = await deleteRepository(name, namespace);
				if (success) {
					showSnackbar(
						`Repository "${repositoryName}" deleted successfully. To reclaim storage, run registry garbage collection: "registry garbage-collect <config>"`,
						"success",
						8000,
					);
				} else {
					showSnackbar(
						"Failed to delete repository. Please try again.",
						"error",
					);
				}
			} else {
				const imagesToDelete = [...selectedImages].map((imageId) => {
					const [tagName] = imageId.split(":");
					return tagName;
				});

				const uniqueTags = [...new Set(imagesToDelete)];
				const [namespace, name] = repositoryKey.includes("/")
					? repositoryKey.split("/", 2)
					: [undefined, repositoryKey];

				const deletePromises = uniqueTags.map((tagName) =>
					deleteTag(name, tagName, namespace),
				);

				const results = await Promise.allSettled(deletePromises);
				const successCount = results.filter(
					(result) => result.status === "fulfilled" && result.value === true,
				).length;

				if (successCount === uniqueTags.length) {
					showSnackbar(
						`${successCount} tag${successCount !== 1 ? "s" : ""} deleted successfully. To reclaim storage, run registry garbage collection: "registry garbage-collect <config>"`,
						"success",
						8000,
					);
				} else if (successCount > 0) {
					const failedCount = uniqueTags.length - successCount;
					showSnackbar(
						`${successCount} of ${uniqueTags.length} tags deleted successfully. ${failedCount} deletion${failedCount !== 1 ? "s" : ""} failed. To reclaim storage, run registry garbage collection: "registry garbage-collect <config>"`,
						"warning",
						8000,
					);
				} else {
					showSnackbar(
						"Failed to delete selected tags. Please try again.",
						"error",
					);
				}
			}
		} finally {
			setIsDeleting(false);
			setSelectedImages(new Set());
			onClose();
		}
	};

	const handleCancel = () => {
		setSelectedImages(new Set());
		onClose();
	};

	return (
		<Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
			<DialogTitle>
				<Typography variant="h6">
					Select Images to Delete from {repositoryName}
				</Typography>
			</DialogTitle>
			<DialogContent>
				<Alert severity="warning" sx={{ mb: 2 }}>
					This action cannot be undone. Selected images will be permanently
					deleted from the repository.
				</Alert>

				<Box sx={{ mb: 2 }}>
					<FormControlLabel
						control={
							<Checkbox
								checked={selectedImages.size === allImages.length}
								indeterminate={
									selectedImages.size > 0 &&
									selectedImages.size < allImages.length
								}
								onChange={handleSelectAll}
								icon={<CheckBoxOutlineBlank />}
								checkedIcon={<CheckBox />}
							/>
						}
						label={`Select All (${allImages.length} images)`}
					/>
				</Box>

				<Box
					sx={{
						maxHeight: "400px",
						overflowY: "auto",
						border: "1px solid",
						borderColor: "divider",
						borderRadius: 1,
						p: 1,
					}}
				>
					<FormGroup>
						{tags.map((tag) =>
							tag.architectures.map((arch: ArchitectureInfo) => {
								const imageId = `${tag.name}:${arch.digest}`;
								return (
									<Box key={imageId} sx={{ ml: 2, mb: 1 }}>
										<FormControlLabel
											control={
												<Checkbox
													checked={selectedImages.has(imageId)}
													onChange={() => handleImageToggle(imageId)}
													size="small"
												/>
											}
											label={
												<Box>
													<Typography variant="body2" component="span">
														<strong>{tag.name}</strong> • {arch.os}/
														{arch.architecture} • {arch.size}
													</Typography>
													<Typography
														variant="caption"
														component="div"
														color="text.secondary"
														sx={{ fontFamily: "monospace" }}
													>
														{arch.digest.substring(0, 20)}...
													</Typography>
												</Box>
											}
										/>
									</Box>
								);
							}),
						)}
					</FormGroup>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={handleCancel} disabled={isDeleting}>
					Cancel
				</Button>
				<Button
					onClick={handleConfirm}
					color="error"
					variant="contained"
					disabled={selectedImages.size === 0 || isDeleting}
					startIcon={isDeleting ? <CircularProgress size={20} /> : null}
				>
					{isDeleting
						? "Deleting..."
						: `Delete ${selectedImages.size} Selected Image${selectedImages.size !== 1 ? "s" : ""}`}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
