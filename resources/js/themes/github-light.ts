// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#0969DA", // Accent blue
		light: "#218bff",
		dark: "#0550ae",
	},
	background: {
		default: "#FFFFFF", // White
		paper: "#F6F8FA", // Off-white
		elevated: "#ffffff",
		elevatedHover: "#f3f4f6",
		gradient: {
			primary: "#24292f", // GitHub light header color (solid, not gradient)
			dark: "linear-gradient(135deg, #F6F8FA 0%, #FFFFFF 100%)",
			darkAlt: "linear-gradient(135deg, #FFFFFF 0%, #F6F8FA 100%)",
		},
	},
	border: {
		default: "#D0D7DE", // Light gray
		light: "#afb8c1",
	},
	text: {
		primary: "#24292F", // Charcoal gray
		secondary: "#57606A", // Muted gray
		tertiary: "#6e7781",
		disabled: "#8c959f",
		white: "#ffffff",
	},
	semantic: {
		error: "#CF222E", // Red
		errorSubtle: "#d1242f",
		warning: "#9A6700", // Gold
		success: "#1A7F37", // Green
		info: "#0969DA", // Blue
		infoSubtle: alpha("#0969DA", 0.1),
		errorSubtle10: alpha("#CF222E", 0.1),
		errorSubtle30: alpha("#CF222E", 0.3),
	},
};

export const theme = createTheme({
	palette: {
		mode: "light",
		primary: {
			main: colors.primary.main,
			light: colors.primary.light,
			dark: colors.primary.dark,
		},
		background: {
			default: colors.background.default,
			paper: colors.background.paper,
		},
		divider: colors.border.default,
		text: {
			primary: colors.text.primary,
			secondary: colors.text.secondary,
			disabled: colors.text.disabled,
		},
		error: {
			main: colors.semantic.error,
			dark: colors.semantic.errorSubtle,
		},
		warning: {
			main: colors.semantic.warning,
		},
		success: {
			main: colors.semantic.success,
		},
		info: {
			main: colors.semantic.info,
		},
	},
	typography: {
		fontFamily:
			"-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif",
		fontFamilyMonospace:
			"'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, monospace",
		h1: {
			fontWeight: 600,
		},
		h2: {
			fontWeight: 600,
		},
		h3: {
			fontWeight: 600,
		},
		h4: {
			fontWeight: 600,
		},
		h5: {
			fontWeight: 600,
		},
		h6: {
			fontWeight: 600,
		},
		body1: {
			fontSize: "0.875rem",
		},
		body2: {
			fontSize: "0.75rem",
		},
		fontSize: 14,
	},
	spacing: 8,
	shape: {
		borderRadius: 6,
	},
	components: {
		MuiCssBaseline: {
			styleOverrides: {
				body: {
					scrollbarWidth: "thin",
					"&::-webkit-scrollbar": {
						width: "10px",
						height: "10px",
					},
					"&::-webkit-scrollbar-track": {
						background: colors.background.paper,
					},
					"&::-webkit-scrollbar-thumb": {
						background: colors.border.default,
						borderRadius: "6px",
					},
					"&::-webkit-scrollbar-thumb:hover": {
						background: colors.border.light,
					},
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
					border: `1px solid ${colors.border.default}`,
					"&:hover": {
						borderColor: colors.border.light,
						boxShadow: `0 3px 8px ${alpha(colors.text.primary, 0.08)}`,
					},
				},
			},
		},
		MuiPaper: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
				},
				outlined: {
					borderColor: colors.border.default,
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: "none",
					fontWeight: 600,
				},
				contained: {
					boxShadow: "none",
					"&:hover": {
						boxShadow: "none",
					},
				},
				outlined: {
					borderColor: colors.border.default,
					"&:hover": {
						borderColor: colors.border.light,
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					fontWeight: 500,
					fontSize: "0.75rem",
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					transition: "all 0.2s ease-in-out",
					"&:hover": {
						backgroundColor: alpha(colors.text.secondary, 0.08),
					},
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					"& .MuiOutlinedInput-root": {
						"& fieldset": {
							borderColor: colors.border.default,
						},
						"&:hover fieldset": {
							borderColor: colors.border.light,
						},
						"&.Mui-focused fieldset": {
							borderColor: colors.primary.main,
						},
					},
				},
			},
		},
	},
});

export const BaseTheme = createTheme(theme, {
	custom: {
		colors,
		typography: {
			fontSizes: {
				xs: "0.65rem",
				sm: "0.7rem",
				md: "0.75rem",
				lg: "0.813rem",
				xl: "0.875rem",
				xxl: "1rem",
				"2xl": "1.125rem",
				"3xl": "1.75rem",
				"4xl": "3rem",
			},
			fontWeights: {
				regular: 400,
				medium: 500,
				semibold: 600,
				bold: 700,
				black: 900,
			},
		},
		sizes: {
			card: {
				height: "170px",
				minHeight: "140px",
				mobileHeight: "190px",
			},
			chip: {
				sm: { height: 18, fontSize: "0.7rem" },
				md: { height: 24, fontSize: "0.75rem" },
				mobileHeight: "20px",
			},
			chipList: {
				minHeight: "40px",
				maxHeight: "40px",
				mobileMaxHeight: "52px",
			},
			repositoryTitle: {
				desktop: "1rem",
				mobile: "1rem",
			},
			emptyState: {
				height: "400px",
				iconSize: 80,
			},
		},
		spacing: {
			commandBoxOffset: "12px",
			fadeGradientWidth: "20px",
			sortLabelMinWidth: "60px",
		},
		animations: {
			transition: {
				fast: "0.2s ease-in-out",
				opacity: "opacity 0.2s",
			},
			opacity: {
				hidden: 0,
				visible: 0.95,
			},
			scale: {
				pressed: "scale(0.98)",
			},
		},
		lineHeights: {
			tight: 1.3,
			normal: 1.5,
			relaxed: 1.6,
		},
	},
});
