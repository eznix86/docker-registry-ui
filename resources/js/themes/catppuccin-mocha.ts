// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#B4BEFE", // Lavender
		light: "#C9CEFC",
		dark: "#9FA4EC",
	},
	background: {
		default: "#1E1E2E", // Deep mauve-gray
		paper: "#181825", // Slightly darker mantle
		elevated: "#313244", // Overlay blue-gray
		elevatedHover: "#45475a",
		gradient: {
			primary: "linear-gradient(90deg, #B4BEFE 0%, #1E1E2E 100%)", // Gentle lavender to deep mauve fade
			dark: "linear-gradient(135deg, #313244 0%, #1E1E2E 100%)",
			darkAlt: "linear-gradient(135deg, #181825 0%, #1E1E2E 100%)",
		},
	},
	border: {
		default: "#313244", // Overlay blue-gray
		light: "#45475a",
	},
	text: {
		primary: "#CDD6F4", // Soft light
		secondary: "#A6ADC8", // Muted gray
		tertiary: "#9399B2",
		disabled: "#6c7086",
		white: "#ffffff",
	},
	semantic: {
		error: "#F38BA8", // Red
		errorSubtle: "#eba0ac",
		warning: "#F9E2AF", // Yellow
		success: "#A6E3A1", // Green
		info: "#89DCEB", // Sky blue
		infoSubtle: alpha("#89DCEB", 0.15),
		errorSubtle10: alpha("#F38BA8", 0.1),
		errorSubtle30: alpha("#F38BA8", 0.3),
	},
};

export const theme = createTheme({
	palette: {
		mode: "dark",
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
		fontFamily: "Inter, 'SF Pro Display', system-ui, sans-serif",
		fontFamilyMonospace:
			"'JetBrains Mono', 'Fira Code', 'SF Mono', Consolas, monospace",
		h1: {
			fontWeight: 700,
		},
		h2: {
			fontWeight: 700,
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
		borderRadius: 8,
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
						background: colors.background.default,
					},
					"&::-webkit-scrollbar-thumb": {
						background: colors.border.default,
						borderRadius: "8px",
					},
					"&::-webkit-scrollbar-thumb:hover": {
						background: colors.border.light,
					},
				},
				"::selection": {
					backgroundColor: alpha(colors.primary.main, 0.3),
					color: colors.text.white,
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
					backgroundColor: colors.background.paper,
					border: `1px solid ${colors.border.default}`,
					"&:hover": {
						borderColor: colors.border.light,
						backgroundColor: colors.background.elevated,
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
						backgroundColor: alpha(colors.primary.main, 0.08),
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
				filled: {
					backgroundColor: colors.background.elevated,
					"&:hover": {
						backgroundColor: colors.background.elevatedHover,
					},
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					transition: "all 0.2s ease-in-out",
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.15),
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
		MuiLink: {
			styleOverrides: {
				root: {
					color: colors.primary.light,
					textDecoration: "none",
					"&:hover": {
						textDecoration: "underline",
						color: colors.primary.main,
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
