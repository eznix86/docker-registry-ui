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
import toast from "react-hot-toast";
import type { Tag } from "../hooks/useRepositoryData";
import { useRepositoryStore } from "../store/repositoryStore";

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
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
	const [isDeleting, setIsDeleting] = useState(false);

	const { deleteRepository, deleteTag } = useRepositoryStore();

	const allTags = tags.map((tag) => tag.name);

	const handleTagToggle = (tagName: string) => {
		const newSelected = new Set(selectedTags);
		if (newSelected.has(tagName)) {
			newSelected.delete(tagName);
		} else {
			newSelected.add(tagName);
		}
		setSelectedTags(newSelected);
	};

	const handleSelectAll = () => {
		if (selectedTags.size === allTags.length) {
			setSelectedTags(new Set());
		} else {
			setSelectedTags(new Set(allTags));
		}
	};

	const handleConfirm = async () => {
		if (selectedTags.size === 0) return;

		setIsDeleting(true);

		try {
			if (selectedTags.size === allTags.length) {
				const [namespace, name] = repositoryKey.includes("/")
					? repositoryKey.split("/", 2)
					: [undefined, repositoryKey];

				const success = await deleteRepository(name, namespace);
				if (success) {
					toast.success(`Repository "${repositoryName}" deleted successfully`, {
						duration: 6000,
					});
				} else {
					toast.error("Failed to delete repository. Please try again.");
				}
			} else {
				const [namespace, name] = repositoryKey.includes("/")
					? repositoryKey.split("/", 2)
					: [undefined, repositoryKey];

				const deletePromises = [...selectedTags].map((tagName) =>
					deleteTag(name, tagName, namespace),
				);

				const results = await Promise.allSettled(deletePromises);
				const successCount = results.filter(
					(result) => result.status === "fulfilled" && result.value === true,
				).length;

				if (successCount === selectedTags.size) {
					toast.success(
						`${successCount} tag${successCount !== 1 ? "s" : ""} deleted successfully`,
						{ duration: 6000 },
					);
				} else if (successCount > 0) {
					const failedCount = selectedTags.size - successCount;
					toast(
						`${successCount} of ${selectedTags.size} tags deleted. ${failedCount} failed`,
						{ duration: 6000, icon: "⚠️" },
					);
				} else {
					toast.error("Failed to delete selected tags. Please try again.");
				}
			}
		} finally {
			setIsDeleting(false);
			setSelectedTags(new Set());
			onClose();
		}
	};

	const handleCancel = () => {
		setSelectedTags(new Set());
		onClose();
	};

	return (
		<Dialog
			open={open}
			onClose={handleCancel}
			maxWidth="md"
			fullWidth
			PaperProps={{
				sx: {
					background: "linear-gradient(135deg, #1a1e23 0%, #0d1117 100%)",
					border: "1px solid #30363d",
					borderRadius: "12px",
					boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
				},
			}}
		>
			<DialogTitle
				sx={{
					color: "text.primary",
					fontWeight: "bold",
					fontSize: "1.25rem",
					textAlign: "center",
					py: 3,
					borderBottom: "1px solid",
					borderColor: "divider",
				}}
			>
				Delete tags from {repositoryName}
			</DialogTitle>
			<DialogContent sx={{ pt: 6, pb: 4, px: 4 }}>
				<Alert severity="warning" sx={{ mt: 4, mb: 4 }}>
					This action cannot be undone. Selected tags will be permanently
					deleted from the repository.
				</Alert>

				<Box sx={{ mb: 2 }}>
					<FormControlLabel
						control={
							<Checkbox
								checked={selectedTags.size === allTags.length}
								indeterminate={
									selectedTags.size > 0 && selectedTags.size < allTags.length
								}
								onChange={handleSelectAll}
								icon={<CheckBoxOutlineBlank />}
								checkedIcon={<CheckBox />}
							/>
						}
						label={`Select All (${allTags.length} tags)`}
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
						{tags.map((tag) => (
							<Box key={tag.name} sx={{ ml: 2, mb: 1 }}>
								<FormControlLabel
									control={
										<Checkbox
											checked={selectedTags.has(tag.name)}
											onChange={() => handleTagToggle(tag.name)}
											size="small"
										/>
									}
									label={
										<Box>
											<Typography variant="body2" component="span">
												<strong>{tag.name}</strong> • {tag.size} •{" "}
												{tag.architectures.length} architecture
												{tag.architectures.length !== 1 ? "s" : ""}
											</Typography>
											<Typography
												variant="caption"
												component="div"
												color="text.secondary"
											>
												{tag.architectures
													.map(
														(arch) =>
															`${arch.os}/${arch.architecture}${arch.variant ? `/${arch.variant}` : ""}`,
													)
													.join(", ")}
											</Typography>
										</Box>
									}
								/>
							</Box>
						))}
					</FormGroup>
				</Box>
			</DialogContent>
			<DialogActions
				sx={{
					p: 3,
					borderTop: "1px solid #30363d",
					background: "rgba(13, 17, 23, 0.6)",
				}}
			>
				<Button onClick={handleCancel} disabled={isDeleting}>
					Cancel
				</Button>
				<Button
					onClick={handleConfirm}
					variant="contained"
					color="error"
					disabled={selectedTags.size === 0 || isDeleting}
					startIcon={isDeleting ? <CircularProgress size={20} /> : null}
				>
					{isDeleting
						? "Deleting..."
						: `Delete ${selectedTags.size} Selected Tag${selectedTags.size !== 1 ? "s" : ""}`}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
