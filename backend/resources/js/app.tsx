import { createInertiaApp } from "@inertiajs/react";
import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { createRoot } from "react-dom/client";
import Layout from "./components/Layout";
import { FiltersProvider } from "./contexts/FiltersContext";
import { ProgressProvider } from "./contexts/ProgressContext";
import { RegistryProvider } from "./contexts/RegistryContext";

// Create Material-UI dark theme (matching original)
const darkTheme = createTheme({
	palette: {
		mode: "dark",
		primary: {
			main: "#4584f7",
		},
		background: {
			default: "#11151a",
			paper: "#11151a",
		},
		divider: "#2f3336",
		text: {
			primary: "#ffffff",
			secondary: "#7d93a9",
		},
	},
	typography: {
		fontFamily: "Roboto, sans-serif",
	},
});

createInertiaApp({
	resolve: (name) => {
		const pages = import.meta.glob("./Pages/**/*.tsx", { eager: true });
		const page = pages[`./Pages/${name}.tsx`] as any;

		// Apply layout and providers to all pages
		page.default.layout =
			page.default.layout ||
			((page: React.ReactNode) => (
				<ThemeProvider theme={darkTheme}>
					<CssBaseline />
					<ProgressProvider>
						<RegistryProvider>
							<FiltersProvider>
								<Layout children={page} />
							</FiltersProvider>
						</RegistryProvider>
					</ProgressProvider>
				</ThemeProvider>
			));

		return page;
	},
	setup({ el, App, props }) {
		const root = createRoot(el);
		root.render(<App {...props} />);
	},
});
