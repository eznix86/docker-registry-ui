// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles"

const colors = {
	primary: {
		main: "#7AA2F7", // Tokyo Night blue
		light: "#9ABEF7",
		dark: "#5E87D8",
	},
	background: {
		default: "#1A1B26", // Tokyo Night background
		paper: "#24283B",
		elevated: "#2F3549",
		elevatedHover: "#363B54",
		gradient: {
			primary: "linear-gradient(90deg, #7AA2F7 0%, #BB9AF7 100%)",
			dark: "linear-gradient(135deg, #2F3549 0%, #1A1B26 100%)",
			darkAlt: "linear-gradient(135deg, #24283B 0%, #16161E 100%)",
		},
	},
	border: {
		default: "#3B4261",
		light: "#444B6A",
	},
	text: {
		primary: "#C0CAF5", // Tokyo Night foreground
		secondary: "#9AA5CE",
		tertiary: "#6B7089",
		disabled: "#565F89",
		white: "#FFFFFF",
	},
	semantic: {
		error: "#F7768E", // Tokyo Night red
		errorSubtle: "#DB4B68",
		warning: "#E0AF68", // Tokyo Night yellow
		success: "#9ECE6A", // Tokyo Night green
		info: "#7AA2F7", // Tokyo Night blue
		infoSubtle: alpha("#7AA2F7", 0.15),
		errorSubtle10: alpha("#F7768E", 0.1),
		errorSubtle30: alpha("#F7768E", 0.3),
	},
}

export const theme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: colors.primary.main,
			light: colors.primary.light,
			dark: colors.primary.dark,
		},
		secondary: {
			main: "#BB9AF7", // Tokyo Night purple
			light: "#CDB0FF",
			dark: "#9570D4",
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
		fontFamily: "'Fira Code', 'JetBrains Mono', monospace, sans-serif",
		fontFamilyMonospace: "'Fira Code', 'JetBrains Mono', monospace",
		h1: {
			fontWeight: 700,
			color: "#7DCFFF", // Tokyo Night cyan
		},
		h2: {
			fontWeight: 700,
			color: "#7DCFFF",
		},
		h3: {
			fontWeight: 700,
			color: colors.text.primary,
		},
		h4: {
			fontWeight: 600,
			color: colors.text.primary,
		},
		h5: {
			fontWeight: 600,
			color: colors.text.primary,
		},
		h6: {
			fontWeight: 600,
			color: colors.text.primary,
		},
		body1: {
			fontSize: "0.9375rem",
		},
		body2: {
			fontSize: "0.875rem",
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
				"body": {
					"scrollbarWidth": "thin",
					"&::-webkit-scrollbar": {
						width: "10px",
						height: "10px",
					},
					"&::-webkit-scrollbar-track": {
						background: colors.background.default,
						borderRadius: "5px",
					},
					"&::-webkit-scrollbar-thumb": {
						background: colors.border.default,
						borderRadius: "5px",
						border: `2px solid ${colors.background.default}`,
					},
					"&::-webkit-scrollbar-thumb:hover": {
						background: colors.border.light,
					},
				},
				"::selection": {
					backgroundColor: alpha("#BB9AF7", 0.3),
					color: colors.text.white,
				},
				"::-moz-selection": {
					backgroundColor: alpha("#BB9AF7", 0.3),
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
					"boxShadow": "none",
					"&:hover": {
						boxShadow: `0 0 12px ${alpha(colors.primary.main, 0.4)}`,
					},
				},
				containedPrimary: {
					"&:hover": {
						backgroundColor: colors.primary.light,
					},
				},
				outlined: {
					"borderColor": colors.border.default,
					"&:hover": {
						borderColor: colors.primary.main,
						backgroundColor: alpha(colors.primary.main, 0.08),
					},
				},
				text: {
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.08),
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					fontWeight: 500,
					borderColor: colors.border.default,
				},
				filled: {
					"backgroundColor": colors.background.elevated,
					"&:hover": {
						backgroundColor: colors.background.elevatedHover,
					},
				},
				outlined: {
					"borderColor": colors.border.default,
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.08),
					},
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					"transition": "all 0.2s ease-in-out",
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.08),
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
					"color": "#7DCFFF", // Tokyo Night cyan
					"textDecoration": "none",
					"&:hover": {
						textDecoration: "underline",
						color: "#9ECE6A", // Green on hover
					},
				},
			},
		},
		MuiTableCell: {
			styleOverrides: {
				root: {
					borderBottomColor: colors.border.default,
				},
				head: {
					backgroundColor: colors.background.elevated,
					fontWeight: 600,
					color: colors.text.primary,
				},
			},
		},
		MuiDivider: {
			styleOverrides: {
				root: {
					borderColor: colors.border.default,
				},
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					backgroundColor: colors.background.elevated,
					border: `1px solid ${colors.border.default}`,
					color: colors.text.primary,
				},
			},
		},
		MuiAlert: {
			styleOverrides: {
				root: {
					borderRadius: 6,
				},
				standardError: {
					backgroundColor: alpha(colors.semantic.error, 0.15),
					color: colors.text.primary,
				},
				standardWarning: {
					backgroundColor: alpha(colors.semantic.warning, 0.15),
					color: colors.text.primary,
				},
				standardInfo: {
					backgroundColor: alpha(colors.semantic.info, 0.15),
					color: colors.text.primary,
				},
				standardSuccess: {
					backgroundColor: alpha(colors.semantic.success, 0.15),
					color: colors.text.primary,
				},
			},
		},
	},
})

export const BaseTheme = createTheme(theme, {
	custom: {
		colors,
		typography: {
			fontSizes: {
				"xs": "0.65rem",
				"sm": "0.7rem",
				"md": "0.75rem",
				"lg": "0.813rem",
				"xl": "0.875rem",
				"xxl": "1rem",
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
})
