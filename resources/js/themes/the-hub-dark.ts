// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#58a6ff",
		light: "#79b8ff",
		dark: "#4584f7",
	},
	background: {
		default: "#0d1117",
		paper: "#161b22",
		elevated: "#1a1e23",
		elevatedHover: "#2a2e33",
		gradient: {
			primary: "linear-gradient(90deg, #1D63ED 0%, #002A8C 100%)",
			dark: "linear-gradient(135deg, #1a1e23 0%, #0d1117 100%)",
			darkAlt: "linear-gradient(135deg, #161b22 0%, #0d1117 100%)",
		},
	},
	border: {
		default: "#30363d",
		light: "#2f3336",
	},
	text: {
		primary: "#c9d1d9",
		secondary: "#8b949e",
		tertiary: "#7d8590",
		disabled: "#6e7681",
		white: "#f0f6fc",
	},
	semantic: {
		error: "#f85149",
		errorSubtle: "#d32f2f",
		warning: "#ffa657",
		success: "#56d364",
		info: "#58a6ff",
		infoSubtle: alpha("#58a6ff", 0.15),
		errorSubtle10: alpha("#f85149", 0.1),
		errorSubtle30: alpha("#f85149", 0.3),
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
		fontFamily: "Roboto, sans-serif",
		fontFamilyMonospace: "monospace",
		h3: {
			fontWeight: 700,
		},
		h6: {
			fontWeight: 600,
		},
		body2: {
			fontSize: "0.875rem",
		},
		fontSize: 14, // Base
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
						width: "8px",
						height: "8px",
					},
					"&::-webkit-scrollbar-track": {
						background: colors.background.default,
					},
					"&::-webkit-scrollbar-thumb": {
						background: colors.border.default,
						borderRadius: "4px",
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
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				contained: {
					boxShadow: "none",
					"&:hover": {
						boxShadow: "none",
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					fontWeight: 500,
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					transition: "all 0.2s ease-in-out",
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
				xs: "0.65rem", // 10.4px
				sm: "0.7rem", // 11.2px
				md: "0.75rem", // 12px
				lg: "0.813rem", // 13px
				xl: "0.875rem", // 14px
				xxl: "1rem", // 16px
				"2xl": "1.125rem", // 18px (Dialog header)
				"3xl": "1.75rem", // 28px (Mobile page title)
				"4xl": "3rem", // 48px (Desktop page title)
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
				mobileHeight: "20px", // Mobile chip height
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
