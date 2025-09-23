import CssBaseline from "@mui/material/CssBaseline";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { Toaster } from "react-hot-toast";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import Layout from "./components/Layout";
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

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
			structuralSharing: true,
			refetchOnWindowFocus: false,
			retry: 1,
		},
	},
});

const persister = createSyncStoragePersister({
	storage: window.localStorage,
	key: "container-registry-cache",
});

function App() {
	return (
		<PersistQueryClientProvider
			client={queryClient}
			persistOptions={{ persister }}
		>
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
					<Toaster
						position="bottom-right"
						toastOptions={{
							style: {
								background: "#1a1e23",
								color: "#ffffff",
								border: "1px solid #2f3336",
							},
							success: {
								iconTheme: {
									primary: "#4584f7",
									secondary: "#ffffff",
								},
							},
							error: {
								iconTheme: {
									primary: "#f44336",
									secondary: "#ffffff",
								},
							},
						}}
					/>
				</Router>
			</ThemeProvider>
		</PersistQueryClientProvider>
	);
}

export default App;
