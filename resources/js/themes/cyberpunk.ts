// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { alpha, createTheme } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#FF00FF", // Neon magenta
		light: "#FF66FF",
		dark: "#CC00CC",
	},
	background: {
		default: "#0A0E27", // Deep dark blue
		paper: "#151935",
		elevated: "#1E2442",
		elevatedHover: "#252B4F",
		gradient: {
			primary: "linear-gradient(90deg, #FF00FF 0%, #00FFFF 100%)",
			dark: "linear-gradient(135deg, #1E2442 0%, #0A0E27 100%)",
			darkAlt: "linear-gradient(135deg, #151935 0%, #0A0E27 100%)",
		},
	},
	border: {
		default: "#2D3561",
		light: "#3A4273",
	},
	text: {
		primary: "#E0E0FF", // Slightly blue-tinted white
		secondary: "#9CA3DB",
		tertiary: "#6B73A8",
		disabled: "#4A5083",
		white: "#FFFFFF",
	},
	semantic: {
		error: "#FF0055", // Neon red/pink
		errorSubtle: "#CC0044",
		warning: "#FFD700", // Neon gold
		success: "#00FF9F", // Neon green/cyan
		info: "#00FFFF", // Neon cyan
		infoSubtle: alpha("#00FFFF", 0.15),
		errorSubtle10: alpha("#FF0055", 0.1),
		errorSubtle30: alpha("#FF0055", 0.3),
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
		secondary: {
			main: "#00FFFF", // Neon cyan
			light: "#66FFFF",
			dark: "#00CCCC",
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
		fontFamily: "'Orbitron', 'Rajdhani', 'Roboto', sans-serif",
		fontFamilyMonospace: "'Share Tech Mono', 'Courier New', monospace",
		h1: {
			fontWeight: 700,
			color: "#00FFFF",
			textShadow: "0 0 10px rgba(0, 255, 255, 0.7)",
		},
		h2: {
			fontWeight: 700,
			color: "#00FFFF",
			textShadow: "0 0 8px rgba(0, 255, 255, 0.6)",
		},
		h3: {
			fontWeight: 700,
			color: "#FF00FF",
			textShadow: "0 0 6px rgba(255, 0, 255, 0.5)",
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
		borderRadius: 4, // Sharper edges for cyber aesthetic
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
						borderRadius: "2px",
					},
					"&::-webkit-scrollbar-thumb": {
						background: `linear-gradient(180deg, ${colors.primary.main} 0%, ${colors.semantic.info} 100%)`,
						borderRadius: "2px",
						border: `1px solid ${colors.border.default}`,
					},
					"&::-webkit-scrollbar-thumb:hover": {
						background: `linear-gradient(180deg, ${colors.primary.light} 0%, #66FFFF 100%)`,
					},
				},
				"::selection": {
					backgroundColor: alpha("#FF00FF", 0.4),
					color: colors.text.white,
					textShadow: "0 0 5px rgba(255, 0, 255, 0.8)",
				},
				"::-moz-selection": {
					backgroundColor: alpha("#FF00FF", 0.4),
					color: colors.text.white,
					textShadow: "0 0 5px rgba(255, 0, 255, 0.8)",
				},
			},
		},
		MuiCard: {
			styleOverrides: {
				root: {
					backgroundImage: "none",
					backgroundColor: colors.background.paper,
					border: `1px solid ${alpha(colors.primary.main, 0.3)}`,
					boxShadow: `0 0 20px ${alpha(colors.primary.main, 0.1)}`,
					"&:hover": {
						border: `1px solid ${alpha(colors.primary.main, 0.6)}`,
						boxShadow: `0 0 25px ${alpha(colors.primary.main, 0.2)}`,
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
					borderColor: alpha(colors.semantic.info, 0.3),
				},
			},
		},
		MuiButton: {
			styleOverrides: {
				root: {
					textTransform: "uppercase",
					fontWeight: 700,
					letterSpacing: "0.05em",
				},
				contained: {
					boxShadow: `0 0 15px ${alpha(colors.primary.main, 0.4)}`,
					"&:hover": {
						boxShadow: `0 0 25px ${alpha(colors.primary.main, 0.7)}`,
					},
				},
				containedPrimary: {
					background: `linear-gradient(135deg, ${colors.primary.main} 0%, #CC00FF 100%)`,
					"&:hover": {
						background: `linear-gradient(135deg, ${colors.primary.light} 0%, #DD55FF 100%)`,
					},
				},
				outlined: {
					borderColor: alpha(colors.primary.main, 0.5),
					borderWidth: "2px",
					"&:hover": {
						borderWidth: "2px",
						borderColor: colors.primary.main,
						backgroundColor: alpha(colors.primary.main, 0.1),
						boxShadow: `0 0 15px ${alpha(colors.primary.main, 0.3)}`,
					},
				},
				text: {
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.1),
					},
				},
			},
		},
		MuiChip: {
			styleOverrides: {
				root: {
					fontWeight: 600,
					borderColor: alpha(colors.semantic.info, 0.4),
					textTransform: "uppercase",
					fontSize: "0.7rem",
				},
				filled: {
					backgroundColor: colors.background.elevated,
					border: `1px solid ${alpha(colors.semantic.info, 0.3)}`,
					"&:hover": {
						backgroundColor: colors.background.elevatedHover,
						boxShadow: `0 0 10px ${alpha(colors.semantic.info, 0.2)}`,
					},
				},
				outlined: {
					borderColor: alpha(colors.semantic.info, 0.4),
					"&:hover": {
						backgroundColor: alpha(colors.semantic.info, 0.1),
						boxShadow: `0 0 10px ${alpha(colors.semantic.info, 0.2)}`,
					},
				},
			},
		},
		MuiIconButton: {
			styleOverrides: {
				root: {
					transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
					"&:hover": {
						backgroundColor: alpha(colors.primary.main, 0.15),
						boxShadow: `0 0 15px ${alpha(colors.primary.main, 0.3)}`,
					},
				},
			},
		},
		MuiTextField: {
			styleOverrides: {
				root: {
					"& .MuiOutlinedInput-root": {
						"& fieldset": {
							borderColor: alpha(colors.semantic.info, 0.3),
							borderWidth: "2px",
						},
						"&:hover fieldset": {
							borderColor: alpha(colors.semantic.info, 0.5),
						},
						"&.Mui-focused fieldset": {
							borderColor: colors.semantic.info,
							boxShadow: `0 0 10px ${alpha(colors.semantic.info, 0.3)}`,
						},
					},
				},
			},
		},
		MuiLink: {
			styleOverrides: {
				root: {
					color: "#00FFFF",
					textDecoration: "none",
					textShadow: "0 0 5px rgba(0, 255, 255, 0.5)",
					"&:hover": {
						textDecoration: "underline",
						color: "#00FF9F",
						textShadow: "0 0 8px rgba(0, 255, 159, 0.7)",
					},
				},
			},
		},
		MuiTableCell: {
			styleOverrides: {
				root: {
					borderBottomColor: alpha(colors.border.default, 0.5),
				},
				head: {
					backgroundColor: colors.background.elevated,
					fontWeight: 700,
					color: colors.semantic.info,
					textTransform: "uppercase",
					letterSpacing: "0.05em",
					borderBottom: `2px solid ${alpha(colors.semantic.info, 0.3)}`,
				},
			},
		},
		MuiDivider: {
			styleOverrides: {
				root: {
					borderColor: alpha(colors.semantic.info, 0.2),
					boxShadow: `0 0 5px ${alpha(colors.semantic.info, 0.1)}`,
				},
			},
		},
		MuiTooltip: {
			styleOverrides: {
				tooltip: {
					backgroundColor: colors.background.elevated,
					border: `1px solid ${alpha(colors.primary.main, 0.5)}`,
					color: colors.text.primary,
					boxShadow: `0 0 15px ${alpha(colors.primary.main, 0.3)}`,
				},
			},
		},
		MuiAlert: {
			styleOverrides: {
				root: {
					borderRadius: 4,
					border: "1px solid",
				},
				standardError: {
					backgroundColor: alpha(colors.semantic.error, 0.15),
					borderColor: alpha(colors.semantic.error, 0.5),
					color: colors.text.primary,
				},
				standardWarning: {
					backgroundColor: alpha(colors.semantic.warning, 0.15),
					borderColor: alpha(colors.semantic.warning, 0.5),
					color: colors.text.primary,
				},
				standardInfo: {
					backgroundColor: alpha(colors.semantic.info, 0.15),
					borderColor: alpha(colors.semantic.info, 0.5),
					color: colors.text.primary,
				},
				standardSuccess: {
					backgroundColor: alpha(colors.semantic.success, 0.15),
					borderColor: alpha(colors.semantic.success, 0.5),
					color: colors.text.primary,
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
				fast: "0.3s cubic-bezier(0.4, 0, 0.2, 1)",
				opacity: "opacity 0.3s",
			},
			opacity: {
				hidden: 0,
				visible: 0.95,
			},
			scale: {
				pressed: "scale(0.95)",
			},
		},
		lineHeights: {
			tight: 1.3,
			normal: 1.5,
			relaxed: 1.6,
		},
	},
});
