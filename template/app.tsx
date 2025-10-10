import { useState, useCallback, useEffect } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Box, Chip, styled, alpha, type Theme } from "@mui/material";
import Layout from "./components/Layout";
import ExplorePage from "./ExplorePage";
import RepositoryPage from "./RepositoryPage";
import { withTheme, type ThemeName } from "./themes";

const PageSwitcher = styled(Box)(({ theme }) => ({
	position: "fixed",
	bottom: 20,
	right: 20,
	zIndex: 1000,
	display: "flex",
	gap: theme.spacing(1),
	backgroundColor: theme.palette.background.paper,
	padding: theme.spacing(1),
	borderRadius: theme.spacing(2),
	border: `1px solid ${theme.palette.divider}`,
	boxShadow: `0 4px 20px ${alpha(theme.palette.common.black, 0.5)}`,
}));

export default function App() {
	const [currentPage, setCurrentPage] = useState<"explore" | "repository">("explore");
	const [theme, setTheme] = useState<Theme | null>(null);

	useEffect(() => {
		withTheme("the-hub-dark" as ThemeName).then(setTheme);
	}, []);

	const handlePageChange = useCallback((page: "explore" | "repository") => {
		setCurrentPage(page);
	}, []);

	const handleRefresh = useCallback(() => {
		console.log("Refreshing repositories...");
	}, []);

	if (!theme) {
		return null; // or a loading spinner
	}

	return (
		<ThemeProvider theme={theme}>
			<CssBaseline />
			<Layout onRefresh={handleRefresh}>
				{/* Page Switcher */}
				<PageSwitcher>
					<Chip
						label="Explore"
						color={currentPage === "explore" ? "primary" : "default"}
						onClick={() => handlePageChange("explore")}
						clickable
					/>
					<Chip
						label="Repository"
						color={currentPage === "repository" ? "primary" : "default"}
						onClick={() => handlePageChange("repository")}
						clickable
					/>
				</PageSwitcher>

				{/* Page Content */}
				{currentPage === "explore" ? <ExplorePage /> : <RepositoryPage />}
			</Layout>
		</ThemeProvider>
	);
}
