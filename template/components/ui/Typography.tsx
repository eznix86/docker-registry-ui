import { Typography as MuiTypography, styled } from "@mui/material";

export const FilterTitle = styled(MuiTypography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.xl,
	fontWeight: theme.custom.typography.fontWeights.semibold,
	marginBottom: theme.spacing(1),
}));

export const Text = styled(MuiTypography)(({ theme }) => ({
	color: theme.palette.text.secondary,
	fontSize: theme.custom.typography.fontSizes.xl,
}));

export const Label = styled(MuiTypography)(({ theme }) => ({
	fontSize: theme.custom.typography.fontSizes.lg,
	color: theme.palette.text.primary,
}));
