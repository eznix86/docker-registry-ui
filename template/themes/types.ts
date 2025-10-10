export type ThemeName =
	| "the-hub-dark"
	| "the-hub-light"
	| "monokai"
	| "nord-dark"
	| "nord-light"
	| "one-dark"
	| "tokyo-night"
	| "cyberpunk";

type HexColor = `#${string}`;
type RgbaColor = `rgba(${number}, ${number}, ${number}, ${number})`;
type Gradient = `linear-gradient(${string})`;

export type Colors = {
	primary: {
		main: HexColor;
		light: HexColor;
		dark: HexColor;
	};
	background: {
		default: HexColor;
		paper: HexColor;
		elevated: HexColor;
		elevatedHover: HexColor;
		gradient: {
			primary: Gradient;
			dark: Gradient;
			darkAlt: Gradient;
		};
	};
	border: {
		default: HexColor;
		light: HexColor;
	};
	text: {
		primary: HexColor;
		secondary: HexColor;
		tertiary: HexColor;
		disabled: HexColor;
		white: HexColor;
	};
	semantic: {
		error: HexColor;
		errorSubtle: HexColor;
		warning: HexColor;
		success: HexColor;
		info: HexColor;
		infoSubtle: RgbaColor | string;
		errorSubtle10: RgbaColor | string;
		errorSubtle30: RgbaColor | string;
	};
};

declare module "@mui/material/styles" {
	interface Theme {
		custom: {
			colors: Colors;
			typography: {
				fontSizes: {
					xs: string;
					sm: string;
					md: string;
					lg: string;
					xl: string;
					xxl: string;
					"2xl": string;
					"3xl": string;
					"4xl": string;
				};
				fontWeights: {
					regular: number;
					medium: number;
					semibold: number;
					bold: number;
					black: number;
				};
			};
			sizes: {
				card: {
					height: string;
					minHeight: string;
					mobileHeight: string;
				};
				chip: {
					sm: { height: number; fontSize: string };
					md: { height: number; fontSize: string };
					mobileHeight: string;
				};
				chipList: {
					minHeight: string;
					maxHeight: string;
					mobileMaxHeight: string;
				};
				repositoryTitle: {
					desktop: string;
					mobile: string;
				};
				emptyState: {
					height: string;
					iconSize: number;
				};
			};
			spacing: {
				commandBoxOffset: string;
				fadeGradientWidth: string;
				sortLabelMinWidth: string;
			};
			animations: {
				transition: {
					fast: string;
					opacity: string;
				};
				opacity: {
					hidden: number;
					visible: number;
				};
				scale: {
					pressed: string;
				};
			};
			lineHeights: {
				tight: number;
				normal: number;
				relaxed: number;
			};
		};
	}
	interface ThemeOptions {
		custom?: {
			colors?: Colors;
			typography?: {
				fontSizes?: {
					xs: string;
					sm: string;
					md: string;
					lg: string;
					xl: string;
					xxl: string;
					"2xl": string;
					"3xl": string;
					"4xl": string;
				};
				fontWeights?: {
					regular: number;
					medium: number;
					semibold: number;
					bold: number;
					black: number;
				};
			};
			sizes?: {
				card?: {
					height: string;
					minHeight: string;
					mobileHeight: string;
				};
				chip?: {
					sm: { height: number; fontSize: string };
					md: { height: number; fontSize: string };
				};
				chipList?: {
					minHeight: string;
					maxHeight: string;
					mobileMaxHeight: string;
				};
				repositoryTitle?: {
					desktop: string;
					mobile: string;
				};
				emptyState?: {
					height: string;
				};
			};
		};
	}
	interface TypographyVariants {
		fontFamilyMonospace: string;
	}
	interface TypographyVariantsOptions {
		fontFamilyMonospace?: string;
	}
}
