import { router } from "@inertiajs/react";
import {
	Refresh as RefreshIcon,
	Search as SearchIcon,
} from "@mui/icons-material";
import {
	AppBar,
	Box,
	IconButton,
	InputBase,
	Toolbar,
	Typography,
} from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import containerHubSvg from "../container-hub.svg";
import { useFilters } from "../contexts/FiltersContext";
import { useProgress } from "../contexts/ProgressContext";

const Search = styled("div")(({ theme }) => ({
	position: "relative",
	borderRadius: theme.shape.borderRadius,
	backgroundColor: alpha(theme.palette.common.white, 0.15),
	"&:hover": {
		backgroundColor: alpha(theme.palette.common.white, 0.25),
	},
	marginLeft: 0,
	width: "100%",
	[theme.breakpoints.up("sm")]: {
		marginLeft: theme.spacing(1),
		width: "auto",
	},
}));

const SearchIconWrapper = styled("div")(({ theme }) => ({
	padding: theme.spacing(0, 2),
	height: "100%",
	position: "absolute",
	pointerEvents: "none",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
	color: "inherit",
	width: "100%",
	"& .MuiInputBase-input": {
		padding: theme.spacing(1, 1, 1, 0),
		paddingLeft: `calc(1em + ${theme.spacing(4)})`,
		transition: theme.transitions.create("width"),
		width: "100%",
	},
}));

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { searchQuery, updateSearch } = useFilters();
	const { progressState, startListening } = useProgress();
	const [isRefreshing, setIsRefreshing] = useState(false);

	const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const query = event.target.value;
		updateSearch(query);
	};

	const handleRefresh = async () => {
		setIsRefreshing(true);

		// try {
		// 	// Start listening to progress events
		// 	startListening();

		// 	// Trigger full refresh via API
		// 	const response = await fetch("/api/refresh", {
		// 		method: "POST",
		// 		headers: {
		// 			"Content-Type": "application/json",
		// 		},
		// 	});

		// 	if (response.ok) {
		// 		// Wait for the progress to complete before reloading
		// 		const checkProgress = () => {
		// 			if (
		// 				progressState.stage === "complete" ||
		// 				progressState.stage === "idle"
		// 			) {
		// 				setTimeout(() => {
		// 					router.reload({
		// 						only: ["repositories", "availableArchitectures", "sources"],
		// 					});
		// 					setIsRefreshing(false);
		// 				}, 1000);
		// 			} else {
		// 				setTimeout(checkProgress, 500);
		// 			}
		// 		};
		// 		checkProgress();
		// 	} else {
		// 		console.error("Failed to trigger refresh");
		// 		setIsRefreshing(false);
		// 	}
		// } catch (error) {
		// 	console.error("Error triggering refresh:", error);
		// 	setIsRefreshing(false);
		// }
	};

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === "k") {
				event.preventDefault();
				searchInputRef.current?.focus();
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, []);

	const getShortcutText = () => {
		const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
		return isMac ? "⌘K" : "Ctrl+K";
	};

	return (
		<Box sx={{ flexGrow: 1 }}>
			<AppBar
				position="static"
				sx={{
					background: "linear-gradient(90deg, #1D63ED 0%, #002A8C 100%)",
					boxShadow: "none",
				}}
			>
				<Toolbar>
					<IconButton
						size="large"
						edge="start"
						color="inherit"
						aria-label="container hub"
						onClick={() => router.get("/")}
						sx={{ mr: 2 }}
					>
						<Box
							component="img"
							src={containerHubSvg}
							alt="ContainerHub"
							sx={{
								width: 32,
								height: 32,
								filter: "brightness(0) invert(1)",
							}}
						/>
					</IconButton>
					<Typography
						variant="h6"
						noWrap
						onClick={() => router.get("/")}
						sx={{
							mr: 2,
							fontWeight: 900,
							color: "inherit",
							textDecoration: "none",
							fontFamily: "Roboto, sans-serif",
							cursor: "pointer",
							"&:hover": {
								color: "inherit",
								textDecoration: "none",
							},
						}}
					>
						ContainerHub
					</Typography>
					<Box
						sx={{
							flexGrow: 1,
							display: "flex",
							justifyContent: "center",
							alignItems: "center",
						}}
					>
						<Box
							component="form"
							onSubmit={handleSearch}
							sx={{
								width: "100%",
								maxWidth: 600,
								mx: { xs: 1, sm: 0 },
								position: "relative",
							}}
						>
							<Search>
								<SearchIconWrapper>
									<SearchIcon />
								</SearchIconWrapper>
								<StyledInputBase
									name="search"
									placeholder="Search repositories..."
									inputProps={{ "aria-label": "search", autoComplete: "off" }}
									inputRef={searchInputRef}
									value={searchQuery}
									onChange={handleSearchChange}
									sx={{ width: "100%" }}
								/>
							</Search>
							<Box
								sx={{
									position: "absolute",
									right: 8,
									top: "50%",
									transform: "translateY(-50%)",
									backgroundColor: "rgba(255, 255, 255, 0.1)",
									borderRadius: 1,
									px: 1,
									py: 0.5,
									fontSize: "0.75rem",
									color: "rgba(255, 255, 255, 0.7)",
									pointerEvents: "none",
									zIndex: 10,
								}}
							>
								{getShortcutText()}
							</Box>
						</Box>
					</Box>

					<IconButton
						size="large"
						aria-label="refresh repositories"
						onClick={handleRefresh}
						disabled={isRefreshing || progressState.isActive}
						sx={{
							color: "white",
							"&.Mui-disabled": {
								color: "rgba(255, 255, 255, 0.5)",
							},
						}}
					>
						<RefreshIcon
							sx={{
								transform: isRefreshing ? "rotate(360deg)" : "none",
								transition: "transform 1s ease-in-out",
								animation:
									isRefreshing || progressState.isActive
										? "spin 1s linear infinite"
										: "none",
								"@keyframes spin": {
									"0%": {
										transform: "rotate(0deg)",
									},
									"100%": {
										transform: "rotate(360deg)",
									},
								},
							}}
						/>
					</IconButton>
				</Toolbar>
			</AppBar>

			<Box sx={{ minHeight: "calc(100vh - 64px)" }}>{children}</Box>
		</Box>
	);
}
