import { Refresh as RefreshIcon } from "@mui/icons-material";
import {
	AppBar,
	Box,
	CircularProgress,
	IconButton,
	Toolbar,
	Typography,
} from "@mui/material";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import containerHubLogo from "../assets/container-hub.svg";
import { useRepositories } from "../hooks/useRepositoryData";
import { useRepositoryStore } from "../store/repositoryStore";
import SearchInput from "./SearchInput";

interface LayoutProps {
	children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
	const searchInputRef = useRef<HTMLInputElement>(null);
	const queryClient = useQueryClient();
	const { isLoading: isRefreshing } = useRepositories();
	const initializeClients = useRepositoryStore(
		(state) => state.initializeClients,
	);

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

	const handleRefresh = async () => {
		try {
			localStorage.removeItem("container-registry-cache");

			queryClient.removeQueries({ queryKey: ["repositories"] });

			toast.promise(initializeClients(), {
				loading: "Refreshing Repositories...",
			});
		} catch (_error) {
			toast.error("Failed to refresh repositories");
		}
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
						aria-label="docker hub"
						component={Link}
						to="/"
						sx={{ mr: 2 }}
					>
						<img
							src={containerHubLogo}
							alt="Container Hub"
							style={{
								width: 24,
								height: 24,
								filter: "brightness(0) invert(1)",
							}}
						/>
					</IconButton>
					<Typography
						variant="h6"
						noWrap
						component={Link}
						to="/"
						sx={{
							mr: 2,
							fontWeight: 900,
							color: "inherit",
							textDecoration: "none",
							fontFamily: "Roboto, sans-serif",
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
							mx: { xs: 1, sm: 0 },
							position: "relative",
						}}
					>
						<SearchInput searchInputRef={searchInputRef} />
					</Box>

					<IconButton
						size="large"
						aria-label="refresh repositories"
						onClick={handleRefresh}
						disabled={isRefreshing}
						sx={{ color: "white" }}
					>
						{isRefreshing ? (
							<CircularProgress size={24} sx={{ color: "white" }} />
						) : (
							<RefreshIcon />
						)}
					</IconButton>
				</Toolbar>
			</AppBar>

			<Box sx={{ minHeight: "calc(100vh - 64px)" }}>{children}</Box>
		</Box>
	);
}
