// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Search as SearchIcon } from "@mui/icons-material";
import { InputBase } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";
import { memo, useMemo } from "react";
import { useExploreFilters } from "~/hooks/useExploreFilters";

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

const InputBaseRoot = styled(InputBase)(({ theme }) => ({
	color: "inherit",
	width: "100%",
	"& .MuiInputBase-input": {
		padding: theme.spacing(1, 1, 1, 0),
		paddingLeft: `calc(1em + ${theme.spacing(4)})`,
		paddingRight: theme.spacing(7),
		transition: theme.transitions.create("width"),
		width: "100%",
		[theme.breakpoints.down("sm")]: {
			fontSize: theme.custom.typography.fontSizes.xl,
		},
	},
}));

interface SearchInputProps {
	placeholder?: string;
}

const FormWrapper = styled("form")({
	width: "100%",
	maxWidth: 600,
});

const ShortcutBadge = styled("div")(({ theme }) => ({
	position: "absolute",
	right: 8,
	top: "50%",
	transform: "translateY(-50%)",
	backgroundColor: alpha(theme.palette.common.white, 0.1),
	borderRadius: theme.spacing(0.5),
	padding: theme.spacing(0.5, 1),
	fontSize: theme.custom.typography.fontSizes.md,
	color: alpha(theme.palette.common.white, 0.7),
	pointerEvents: "none",
	zIndex: 10,
}));

const getShortcutText = (): string => {
	if (typeof window.navigator === "undefined") return "Ctrl+K";
	const isMac = window.navigator.userAgent.toUpperCase().indexOf("MAC") >= 0;
	return isMac ? "⌘K" : "Ctrl+K";
};

const getOnMobile = (): boolean => {
	if (typeof window.navigator === "undefined") return true;
	return window.navigator.userAgent.toUpperCase().indexOf("MOBILE") >= 0;
};

function SearchInput({
	placeholder = "Search repositories...",
}: SearchInputProps) {
	const shortcutText = useMemo(() => getShortcutText(), []);
	const isOnMobile = useMemo(() => getOnMobile(), []);

	const { localSearch, setSearch } = useExploreFilters();

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		setSearch(event.target.value);
	};

	return (
		<FormWrapper>
			<Search sx={{ position: "relative" }}>
				<SearchIconWrapper>
					<SearchIcon />
				</SearchIconWrapper>
				<InputBaseRoot
					name="search"
					placeholder={placeholder}
					inputProps={{ "aria-label": "search", autoComplete: "off" }}
					value={localSearch}
					onChange={handleChange}
					sx={{ width: "100%", pr: 6 }}
				/>
				<ShortcutBadge
					sx={{
						display: isOnMobile ? "none" : "block",
					}}
				>
					{shortcutText}
				</ShortcutBadge>
			</Search>
		</FormWrapper>
	);
}

export default memo(SearchInput);
