import { createTheme, alpha } from "@mui/material/styles";

const colors = {
	primary: {
		main: "#88C0D0",      // Nord frost cyan
		light: "#8FBCBB",     // Lighter frost
		dark: "#5E81AC",      // Darker frost blue
	},
	background: {
		default: "#2E3440",   // Nord polar night darkest
		paper: "#3B4252",     // Polar night lighter
		elevated: "#434C5E",  // Elevated surface
		elevatedHover: "#4C566A", // Hover state
		gradient: {
			primary: "linear-gradient(90deg, #88C0D0 0%, #5E81AC 100%)",
			dark: "linear-gradient(135deg, #434C5E 0%, #2E3440 100%)",
			darkAlt: "linear-gradient(135deg, #3B4252 0%, #2E3440 100%)",
		},
	},
	border: {
		default: "#4C566A",   // Nord polar night lightest
		light: "#5A6478",
	},
	text: {
		primary: "#ECEFF4",   // Nord snow storm brightest
		secondary: "#D8DEE9", // Snow storm mid
		tertiary: "#A5ADB8",  // Muted text
		disabled: "#6B7380",
		white: "#FFFFFF",
	},
	semantic: {
		error: "#BF616A",     // Nord aurora red
		errorSubtle: "#A54B54",
		warning: "#EBCB8B",   // Nord aurora yellow
		success: "#A3BE8C",   // Nord aurora green
		info: "#88C0D0",      // Nord frost cyan
		infoSubtle: alpha("#88C0D0", 0.15),
		errorSubtle10: alpha("#BF616A", 0.1),
		errorSubtle30: alpha("#BF616A", 0.3),
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
