import { Box, Typography, styled } from "@mui/material";
import { memo, useCallback } from "react";
import { Card, Chip } from "./ui";

export interface RepositoryMeta {
	name: string;
	namespace?: string;
	source?: string;
	tagCount: number;
	architectures?: string[];
	totalSizeFormatted?: string;
}

interface RepositoryCardProps {
	repository: RepositoryMeta;
	onUntaggedClick?: (repo: RepositoryMeta) => void;
	sourceHost?: string;
}

const UntaggedCardAction = styled(Card.Action)({
	cursor: "help",
});

const RepositoryTitle = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontSize: theme.custom.sizes.repositoryTitle.desktop,
	fontWeight: theme.custom.typography.fontWeights.semibold,
	lineHeight: theme.custom.lineHeights.tight,
}));

const ArchitecturesContainer = styled(Box)(({ theme }) => ({
	flexGrow: 1,
	display: "flex",
	flexDirection: "column",
	justifyContent: "flex-start",
	minHeight: theme.custom.sizes.chipList.minHeight,
	maxHeight: theme.custom.sizes.chipList.maxHeight,
	[theme.breakpoints.down("md")]: {
		minHeight: theme.custom.sizes.chipList.maxHeight,
	},
	[theme.breakpoints.down("sm")]: {
		minHeight: theme.custom.sizes.chipList.mobileMaxHeight,
		maxHeight: "auto",
	},
}));



const FooterContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
	marginTop: "auto",
}));

const SizeContainer = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	gap: theme.spacing(0.5),
}));

const SourceText = styled(Typography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.md,
	color: theme.palette.text.disabled,
	fontStyle: "italic",
}));

const NoArchText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.disabled,
	fontSize: theme.custom.typography.fontSizes.md,
	fontStyle: "italic",
	alignSelf: "center",
}));

const getDisplayName = (repo: RepositoryMeta) => {
	return repo.namespace ? `${repo.namespace}/${repo.name}` : repo.name;
};

function RepositoryCard({
	repository,
	onUntaggedClick,
	sourceHost = "registry.local",
}: RepositoryCardProps) {
	const handleUntaggedClick = useCallback(() => {
		onUntaggedClick?.(repository);
	}, [onUntaggedClick, repository]);

	if (repository.tagCount === 0) {
		return (
			<Card elevation={0} variant="outlined">
				<UntaggedCardAction onClick={handleUntaggedClick}>
					<Card.Body>
						<Box sx={{ mb: 1 }}>
							<RepositoryTitle variant="h6">
								{getDisplayName(repository)}
							</RepositoryTitle>
						</Box>
						<ArchitecturesContainer>
							<Chip.List>
								<Chip variant="warning" label="untagged" />
							</Chip.List>
						</ArchitecturesContainer>
						<FooterContainer>
							<SizeContainer>
								<Typography variant="body2" sx={(theme) => ({ fontWeight: theme.custom.typography.fontWeights.medium })}>
									Size
								</Typography>
								<Typography variant="body2" sx={(theme) => ({ fontSize: theme.custom.typography.fontSizes.md })}>
									0 B
								</Typography>
							</SizeContainer>
							<SourceText variant="body2">{sourceHost}</SourceText>
						</FooterContainer>
					</Card.Body>
				</UntaggedCardAction>
			</Card>
		);
	}

	return (
		<Card elevation={0} variant="outlined">
			<Card.Action>
				<Card.Body>
					<Box sx={{ mb: 1 }}>
						<RepositoryTitle variant="h6">
							{getDisplayName(repository)}
						</RepositoryTitle>
					</Box>

					<ArchitecturesContainer>
						<Chip.List>
							{repository.architectures && repository.architectures.length > 0 ? (
								<>
									{repository.architectures.slice(0, 8).map((arch: string) => (
										<Chip
											key={arch}
											variant="outlined"
											label={arch}
											size="small"
										/>
									))}
									{repository.architectures.length > 8 && (
										<Chip
											variant="solid"
											label={`+${repository.architectures.length - 8}`}
											size="small"
										/>
									)}
								</>
							) : (
								<NoArchText variant="body2">No architecture info</NoArchText>
							)}
						</Chip.List>
					</ArchitecturesContainer>

					<FooterContainer>
						<SizeContainer>
							<Typography variant="body2" sx={(theme) => ({ fontWeight: theme.custom.typography.fontWeights.medium })}>
								Size
							</Typography>
							<Typography variant="body2" sx={(theme) => ({ fontSize: theme.custom.typography.fontSizes.md })}>
								{repository.totalSizeFormatted || "Unknown"}
							</Typography>
						</SizeContainer>
						<SourceText variant="body2">{sourceHost}</SourceText>
					</FooterContainer>
				</Card.Body>
			</Card.Action>
		</Card>
	);
}

export default memo(RepositoryCard);
