import { Search as SearchIcon } from "@mui/icons-material";
import { InputBase } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

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

interface SearchInputProps {
	searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export default function SearchInput({ searchInputRef }: SearchInputProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const [searchParams] = useSearchParams();

	const [searchValue, setSearchValue] = useState(
		searchParams.get("search") || "",
	);
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const isUpdatingFromURLRef = useRef(false);

	const updateURL = useCallback(
		(query: string) => {
			const currentSearch = location.search;

			const currentSearchParams = new URLSearchParams(currentSearch);
			const trimmedQuery = query.trim();

			if (trimmedQuery) {
				currentSearchParams.set("search", trimmedQuery);
			} else {
				currentSearchParams.delete("search");
			}

			const newSearch = currentSearchParams.toString();
			const newPath = `/${newSearch ? `?${newSearch}` : ""}`;

			navigate(newPath, { replace: true });
		},
		[location.search, navigate],
	);

	const handleSearch = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}

		updateURL(searchValue);
	};

	const handleSearchChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const query = event.target.value;
			setSearchValue(query);

			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}

			debounceTimeoutRef.current = setTimeout(() => {
				if (!isUpdatingFromURLRef.current) {
					if (window.requestIdleCallback) {
						window.requestIdleCallback(() => updateURL(query));
					} else {
						updateURL(query);
					}
				}
			}, 300);
		},
		[updateURL],
	);

	useEffect(() => {
		const urlSearchValue = searchParams.get("search") || "";
		isUpdatingFromURLRef.current = true;
		setSearchValue(urlSearchValue);

		setTimeout(() => {
			isUpdatingFromURLRef.current = false;
		}, 0);
	}, [searchParams]);

	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	const getShortcutText = () => {
		const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
		return isMac ? "⌘K" : "Ctrl+K";
	};

	return (
		<form onSubmit={handleSearch} style={{ width: "100%", maxWidth: 600 }}>
			<Search sx={{ position: "relative" }}>
				<SearchIconWrapper>
					<SearchIcon />
				</SearchIconWrapper>
				<StyledInputBase
					name="search"
					placeholder="Search repositories..."
					inputProps={{ "aria-label": "search", autoComplete: "off" }}
					inputRef={searchInputRef}
					value={searchValue}
					onChange={handleSearchChange}
					sx={{ width: "100%", pr: 6 }}
				/>
				<div
					style={{
						position: "absolute",
						right: 8,
						top: "50%",
						transform: "translateY(-50%)",
						backgroundColor: "rgba(255, 255, 255, 0.1)",
						borderRadius: 4,
						padding: "4px 8px",
						fontSize: "0.75rem",
						color: "rgba(255, 255, 255, 0.7)",
						pointerEvents: "none",
						zIndex: 10,
					}}
				>
					{getShortcutText()}
				</div>
			</Search>
		</form>
	);
}
