import { createTheme, alpha } from "@mui/material/styles";

const colors = {
    primary: {
        main: "#F92672",      // Monokai pink/magenta
        light: "#FF6188",     // Lighter pink
        dark: "#E61F5A",      // Darker pink
    },
    background: {
        default: "#272822",   // Classic Monokai background
        paper: "#2F2F2A",     // Slightly lighter
        elevated: "#3E3D32",  // Elevated surface
        elevatedHover: "#4A493D",  // Hover state
        gradient: {
            primary: "linear-gradient(90deg, #F92672 0%, #AE81FF 100%)",  // Pink to purple
            dark: "linear-gradient(135deg, #3E3D32 0%, #272822 100%)",
            darkAlt: "linear-gradient(135deg, #2F2F2A 0%, #1E1F1C 100%)",
        },
    },
    border: {
        default: "#49483E",   // Monokai comment color
        light: "#5A5A4E",     // Lighter border
    },
    text: {
        primary: "#F8F8F2",   // Monokai foreground
        secondary: "#A6A296", // Muted text
        tertiary: "#75715E",  // Comments
        disabled: "#5F5E54",  // Disabled state
        white: "#FFFFFF",     // Pure white
    },
    semantic: {
        error: "#F92672",     // Pink for errors
        errorSubtle: "#E61F5A",
        warning: "#FD971F",   // Orange for warnings
        success: "#A6E22E",   // Green for success
        info: "#66D9EF",      // Cyan for info
        infoSubtle: alpha("#66D9EF", 0.15),
        errorSubtle10: alpha("#F92672", 0.1),
        errorSubtle30: alpha("#F92672", 0.3),
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
            main: "#AE81FF",  // Purple (Monokai constant color) as secondary
            light: "#C9A8FF",
            dark: "#8B5FCF",
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
        fontFamily: "'Fira Code', 'JetBrains Mono', 'Monaco', monospace, sans-serif",
        fontFamilyMonospace: "'Fira Code', 'JetBrains Mono', 'Monaco', monospace",
        h1: {
            fontWeight: 700,
            color: "#66D9EF",
        },
        h2: {
            fontWeight: 700,
            color: "#66D9EF",
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
            fontSize: "0.9375rem",  // Slightly larger for readability
        },
        body2: {
            fontSize: "0.875rem",
        },
        fontSize: 14, // Base
    },
    spacing: 8,
    shape: {
        borderRadius: 6,  // Slightly less rounded for a more technical look
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
                // Monokai-style selection
                "::selection": {
                    backgroundColor: alpha("#AE81FF", 0.3),  // Purple
                    color: colors.text.white,
                },
                "::-moz-selection": {
                    backgroundColor: alpha("#AE81FF", 0.3),
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
                    textTransform: "none",  // More modern, less shouty
                    fontWeight: 600,
                },
                contained: {
                    boxShadow: "none",
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
                    borderColor: colors.border.default,
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
                    backgroundColor: colors.background.elevated,
                    "&:hover": {
                        backgroundColor: colors.background.elevatedHover,
                    },
                },
                outlined: {
                    borderColor: colors.border.default,
                    "&:hover": {
                        backgroundColor: alpha(colors.primary.main, 0.08),
                    },
                },
            },
        },
        MuiIconButton: {
            styleOverrides: {
                root: {
                    transition: "all 0.2s ease-in-out",
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
                    color: "#66D9EF",  // Cyan (Monokai className color) for links
                    textDecoration: "none",
                    "&:hover": {
                        textDecoration: "underline",
                        color: "#A6E22E",  // Green (Monokai function color) on hover
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
});

export const BaseTheme = createTheme(theme, {
    custom: {
        colors,
        typography: {
            fontSizes: {
                xs: "0.65rem",   // 10.4px
                sm: "0.7rem",    // 11.2px
                md: "0.75rem",   // 12px
                lg: "0.813rem",  // 13px
                xl: "0.875rem",  // 14px
                xxl: "1rem",     // 16px
                "2xl": "1.125rem", // 18px (Dialog header)
                "3xl": "1.75rem",  // 28px (Mobile page title)
                "4xl": "3rem",     // 48px (Desktop page title)
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
