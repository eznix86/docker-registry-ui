// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#58A6FF", // Accent blue
		light: "#79c0ff",
		dark: "#1f6feb",
	},
	background: {
		default: "#0D1117", // Deep charcoal
		paper: "#161B22", // Slightly lighter graphite
		elevated: "#21262d",
		elevatedHover: "#30363d",
		gradient: {
			primary: "#26292e", // GitHub header color (solid, not gradient)
			dark: "linear-gradient(135deg, #21262d 0%, #0D1117 100%)",
			darkAlt: "linear-gradient(135deg, #161B22 0%, #0D1117 100%)",
		},
	},
	border: {
		default: "#30363D", // Dark border gray
		light: "#484f58",
	},
	text: {
		primary: "#C9D1D9", // Off-white
		secondary: "#8B949E", // Muted gray
		tertiary: "#7d8590",
		disabled: "#6e7681",
		white: "#ffffff",
	},
	semantic: {
		error: "#F85149", // Red
		errorSubtle: "#da3633",
		warning: "#D29922", // Yellow
		success: "#3FB950", // Green
		info: "#58A6FF", // Blue
		infoSubtle: alpha("#58A6FF", 0.15),
		errorSubtle10: alpha("#F85149", 0.1),
		errorSubtle30: alpha("#F85149", 0.3),
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
						background: colors.background.default,
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
						backgroundColor: alpha(colors.text.secondary, 0.1),
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
