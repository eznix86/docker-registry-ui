import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import { SnackbarProvider } from "./components/SnackbarProvider";
import ExplorePage from "./pages/ExplorePage";
import RepositoryPage from "./pages/RepositoryPage";

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

function App() {
	return (
		<ThemeProvider theme={darkTheme}>
			<CssBaseline />
			<Router>
				<Layout>
					<Routes>
						<Route path="/" element={<ExplorePage />} />
						<Route path="/repository/:name" element={<RepositoryPage />} />
						<Route
							path="/repository/:namespace/:name"
							element={<RepositoryPage />}
						/>
					</Routes>
				</Layout>
				<SnackbarProvider />
			</Router>
		</ThemeProvider>
	);
}

export default App;
