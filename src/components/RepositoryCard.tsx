import {
	Box,
	Card,
	CardActionArea,
	CardContent,
	Chip,
	Typography,
} from "@mui/material";
import { memo } from "react";
import { Link } from "react-router-dom";
import { useFilter } from "../contexts/FilterContext";
import type { RepositoryMeta } from "../hooks/useRepositoryData";

interface RepositoryCardProps {
	repository: RepositoryMeta;
	onUntaggedClick: (repo: RepositoryMeta) => void;
}

const getRepositoryPath = (repo: RepositoryMeta) => {
	const basePath = repo.namespace
		? `/repository/${encodeURIComponent(repo.namespace)}/${encodeURIComponent(repo.name)}`
		: `/repository/${encodeURIComponent(repo.name)}`;
	return repo.source
		? `${basePath}?source=${encodeURIComponent(repo.source)}`
		: basePath;
};

const getDisplayName = (repo: RepositoryMeta) => {
	return repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name;
};

const RepositoryCard = memo(function RepositoryCard({
	repository,
	onUntaggedClick,
}: RepositoryCardProps) {
	const { getSourceHost } = useFilter();

	const handleUntaggedClick = () => {
		onUntaggedClick(repository);
	};

	if (repository.tagCount === 0) {
		return (
			<Card
				elevation={0}
				variant="outlined"
				sx={{
					height: {
						xs: "auto",
						sm: "190px",
						md: "170px",
					},
					minHeight: {
						xs: "140px",
					},
					display: "flex",
					flexDirection: "column",
					bgcolor: "transparent",
					borderColor: "divider",
					"&:hover": {
						borderColor: "primary.main",
						boxShadow: "0 0 0 1px #4584f7",
					},
					transition:
						"border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
					willChange: "auto",
				}}
			>
				<CardActionArea
					onClick={handleUntaggedClick}
					sx={{
						textDecoration: "none",
						color: "inherit",
						flexGrow: 1,
						display: "flex",
						flexDirection: "column",
						cursor: "help",
						"&:hover": {
							bgcolor: "action.hover",
						},
					}}
				>
					<CardContent
						sx={{
							p: 1.5,
							"&:last-child": { pb: 1.5 },
							flexGrow: 1,
							display: "flex",
							flexDirection: "column",
							justifyContent: "space-between",
							width: "100%",
						}}
					>
						<Box sx={{ mb: 1 }}>
							<Typography
								variant="h6"
								sx={{
									color: "text.primary",
									fontSize: "1rem",
									fontWeight: 600,
									lineHeight: 1.3,
								}}
							>
								{getDisplayName(repository)}
							</Typography>
						</Box>
						<Box
							sx={{
								flexGrow: 1,
								display: "flex",
								flexDirection: "column",
								justifyContent: "flex-start",
								minHeight: {
									xs: "52px",
									sm: "48px",
									md: "44px",
								},
								maxHeight: {
									xs: "auto",
									sm: "48px",
									md: "44px",
								},
							}}
						>
							<Box
								sx={{
									display: "flex",
									gap: 0.5,
									flexWrap: "wrap",
									minHeight: {
										xs: "40px",
										sm: "40px",
									},
									maxHeight: {
										xs: "auto",
										sm: "40px",
									},
									overflow: "hidden",
									mb: 1,
									alignContent: "flex-start",
								}}
							>
								<Chip
									label="untagged"
									size="small"
									variant="outlined"
									sx={{
										fontSize: "0.7rem",
										height: 18,
										borderColor: "warning.main",
										color: "warning.main",
										"& .MuiChip-label": {
											px: 0.5,
										},
									}}
								/>
							</Box>
						</Box>
						<Box
							sx={{
								display: "flex",
								justifyContent: "space-between",
								alignItems: "center",
								color: "text.secondary",
								fontSize: "0.875rem",
								mt: "auto",
							}}
						>
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 0.5,
								}}
							>
								<Typography variant="body2" sx={{ fontWeight: 500 }}>
									Size
								</Typography>
								<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
									0 B
								</Typography>
							</Box>
							<Typography
								variant="body2"
								sx={{
									fontSize: "0.75rem",
									color: "text.disabled",
									fontStyle: "italic",
								}}
							>
								{getSourceHost(repository.source)}
							</Typography>
						</Box>
					</CardContent>
				</CardActionArea>
			</Card>
		);
	}

	return (
		<Card
			elevation={0}
			variant="outlined"
			sx={{
				height: {
					xs: "auto",
					sm: "190px",
					md: "170px",
				},
				minHeight: {
					xs: "140px",
				},
				display: "flex",
				flexDirection: "column",
				bgcolor: "transparent",
				borderColor: "divider",
				"&:hover": {
					borderColor: "primary.main",
					boxShadow: "0 0 0 1px #4584f7",
				},
				transition:
					"border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
				willChange: "auto",
			}}
		>
			<CardActionArea
				component={Link}
				to={getRepositoryPath(repository)}
				sx={{
					textDecoration: "none",
					color: "inherit",
					flexGrow: 1,
					display: "flex",
					flexDirection: "column",
				}}
			>
				<CardContent
					sx={{
						p: 1.5,
						"&:last-child": { pb: 1.5 },
						flexGrow: 1,
						display: "flex",
						flexDirection: "column",
						justifyContent: "space-between",
						width: "100%",
					}}
				>
					<Box sx={{ mb: 1 }}>
						<Typography
							variant="h6"
							sx={{
								color: "text.primary",
								fontSize: "1rem",
								fontWeight: 600,
								lineHeight: 1.3,
							}}
						>
							{getDisplayName(repository)}
						</Typography>
					</Box>

					<Box
						sx={{
							flexGrow: 1,
							display: "flex",
							flexDirection: "column",
							justifyContent: "flex-start",
							minHeight: {
								xs: "52px",
								sm: "48px",
								md: "44px",
							},
							maxHeight: {
								xs: "auto",
								sm: "48px",
								md: "44px",
							},
						}}
					>
						<Box
							sx={{
								display: "flex",
								gap: 0.5,
								flexWrap: "wrap",
								minHeight: {
									xs: "40px",
									sm: "40px",
								},
								maxHeight: {
									xs: "auto",
									sm: "40px",
								},
								overflow: "hidden",
								mb: 1,
								alignContent: "flex-start",
							}}
						>
							{repository.architectures &&
								repository.architectures.length > 0 ? (
								<>
									{repository.architectures.slice(0, 8).map((arch: string) => (
										<Chip
											key={arch}
											label={arch}
											size="small"
											variant="outlined"
											sx={{
												fontSize: "0.7rem",
												height: 18,
												borderColor: "divider",
												color: "text.secondary",
												"& .MuiChip-label": {
													px: 0.5,
												},
											}}
										/>
									))}
									{repository.architectures.length > 8 && (
										<Chip
											label={`+${repository.architectures.length - 8}`}
											size="small"
											variant="outlined"
											sx={{
												fontSize: "0.7rem",
												height: 18,
												borderColor: "primary.main",
												color: "primary.main",
												"& .MuiChip-label": {
													px: 0.5,
												},
											}}
										/>
									)}
								</>
							) : (
								<Typography
									variant="body2"
									sx={{
										color: "text.disabled",
										fontSize: "0.75rem",
										fontStyle: "italic",
										alignSelf: "center",
									}}
								>
									No architecture info
								</Typography>
							)}
						</Box>
					</Box>

					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
							color: "text.secondary",
							fontSize: "0.875rem",
							mt: "auto",
						}}
					>
						<Box
							sx={{
								display: "flex",
								alignItems: "center",
								gap: 0.5,
							}}
						>
							<Typography variant="body2" sx={{ fontWeight: 500 }}>
								Size
							</Typography>
							<Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
								{repository.totalSizeFormatted || "Unknown"}
							</Typography>
						</Box>
						<Typography
							variant="body2"
							sx={{
								fontSize: "0.75rem",
								color: "text.disabled",
								fontStyle: "italic",
							}}
						>
							{getSourceHost(repository.source)}
						</Typography>
					</Box>
				</CardContent>
			</CardActionArea>
		</Card>
	);
});

export default RepositoryCard;
