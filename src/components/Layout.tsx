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
import {
	Link,
	useLocation,
	useNavigate,
	useSearchParams,
} from "react-router-dom";
import containerHubLogo from "../assets/container-hub.svg";
import { useRepositoryStore } from "../store/repositoryStore";

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
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();
	const searchInputRef = useRef<HTMLInputElement>(null);
	const { fetchRepositoryMetas } = useRepositoryStore();

	const [searchValue, setSearchValue] = useState(
		searchParams.get("search") || "",
	);

	const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
	};

	const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const query = event.target.value;
		setSearchValue(query);

		const currentSearchParams = new URLSearchParams(location.search);

		if (query.trim()) {
			currentSearchParams.set("search", query.trim());
		} else {
			currentSearchParams.delete("search");
		}

		const newSearch = currentSearchParams.toString();
		navigate(`/${newSearch ? `?${newSearch}` : ""}`);
	};

	useEffect(() => {
		const urlSearchValue = searchParams.get("search") || "";
		if (urlSearchValue !== searchValue) {
			setSearchValue(urlSearchValue);
		}
	}, [searchParams, searchValue]);

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
									inputProps={{ "aria-label": "search" }}
									inputRef={searchInputRef}
									value={searchValue}
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
						onClick={async () => {
							await fetchRepositoryMetas(true);
						}}
						sx={{ color: "white" }}
					>
						<RefreshIcon />
					</IconButton>
				</Toolbar>
			</AppBar>

			<Box sx={{ minHeight: "calc(100vh - 64px)" }}>{children}</Box>
		</Box>
	);
}
