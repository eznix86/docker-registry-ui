import { Chip as MuiChip, Box, styled, type ChipProps as MuiChipProps } from "@mui/material";
import { forwardRef } from "react";

type Variant = "outlined" | "solid" | "warning";

interface CustomChipProps extends Omit<MuiChipProps, "variant" | "size"> {
	variant?: Variant;
	size?: "sm" | "md" | "small" | "medium";
}

const StyledChip = styled(MuiChip, {
	shouldForwardProp: (prop) => prop !== "customVariant" && prop !== "customSize",
})<{ customVariant?: Variant; customSize?: "sm" | "md" | "small" | "medium" }>(({ theme, customVariant = "outlined", customSize = "sm" }) => {
	const actualSize = customSize === "sm" || customSize === "small" ? "sm" : "md";
	const chipSize = theme.custom.sizes.chip[actualSize];

	const baseStyles = {
		fontSize: chipSize.fontSize,
		height: chipSize.height,
		flexShrink: 0,
		"& .MuiChip-label": {
			paddingLeft: theme.spacing(0.5),
			paddingRight: theme.spacing(0.5),
		},
	};

	const sizeStyles = actualSize === "md" ? {
		[theme.breakpoints.down("sm")]: {
			fontSize: theme.custom.typography.fontSizes.xs,
			height: theme.custom.sizes.chip.mobileHeight,
		},
	} : {};

	const variantStyles: Record<Variant, any> = {
		outlined: {
			borderColor: theme.palette.divider,
			color: theme.palette.text.secondary,
		},
		solid: {
			borderColor: theme.palette.primary.main,
			color: theme.palette.primary.main,
		},
		warning: {
			borderColor: theme.palette.divider,
			color: theme.palette.warning.main,
		},
	};

	return {
		...baseStyles,
		...sizeStyles,
		...variantStyles[customVariant],
	};
});

const ChipRoot = forwardRef<HTMLDivElement, CustomChipProps>((props, ref) => {
	const { variant, size, ...rest } = props;
	const muiSize = size === "sm" || size === "md" ? "small" : size;
	return <StyledChip ref={ref} variant="outlined" size={muiSize} customVariant={variant} customSize={size} {...rest} />;
});

ChipRoot.displayName = "Chip";

const ChipList = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(0.5),
	flexWrap: "wrap",
	minHeight: theme.custom.sizes.chipList.minHeight,
	maxHeight: theme.custom.sizes.chipList.maxHeight,
	overflow: "hidden",
	marginBottom: theme.spacing(1),
	alignContent: "flex-start",
	[theme.breakpoints.down("sm")]: {
		maxHeight: "auto",
	},
}));

const ChipScrollList = styled(Box)(({ theme }) => ({
	display: "flex",
	gap: theme.spacing(1),
	overflowX: "visible",
	flexWrap: "wrap",
	paddingBottom: 0,
	"&::-webkit-scrollbar": {
		display: "none",
	},
	scrollbarWidth: "none",
	msOverflowStyle: "none",
	[theme.breakpoints.down("sm")]: {
		overflowX: "auto",
		flexWrap: "nowrap",
	},
}));

export const Chip = Object.assign(ChipRoot, {
	List: ChipList,
	ScrollList: ChipScrollList,
});
