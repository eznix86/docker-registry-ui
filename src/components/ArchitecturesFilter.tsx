import { FormControl, MenuItem, Select, Typography } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { memo, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useFilter } from "../contexts/FilterContext";

export default memo(function ArchitecturesFilter() {
	const { availableArchitectures } = useFilter();
	const [searchParams, setSearchParams] = useSearchParams();
	const archQuery = searchParams.get("arch") || "all";

	const [architectureFilter, setArchitectureFilter] = useState(archQuery);

	const updateURL = useCallback(
		(newArch: string) => {
			const newSearchParams = new URLSearchParams(searchParams);
			if (newArch === "all") {
				newSearchParams.delete("arch");
			} else {
				newSearchParams.set("arch", newArch);
			}
			setSearchParams(newSearchParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	useEffect(() => {
		const urlArch = searchParams.get("arch") || "all";
		if (urlArch !== architectureFilter) {
			setArchitectureFilter(urlArch);
		}
	}, [searchParams, architectureFilter]);

	useEffect(() => {
		if (
			architectureFilter !== "all" &&
			!availableArchitectures.includes(architectureFilter)
		) {
			setArchitectureFilter("all");
			updateURL("all");
		}
	}, [availableArchitectures, architectureFilter, updateURL]);

	const handleArchitectureChange = useCallback(
		(event: SelectChangeEvent) => {
			const newArch = event.target.value;
			setArchitectureFilter(newArch);
			updateURL(newArch);
		},
		[updateURL],
	);

	return (
		<>
			<Typography
				variant="h6"
				gutterBottom
				sx={{ fontSize: "0.875rem", fontWeight: 600 }}
			>
				Architectures
			</Typography>
			<FormControl size="small" fullWidth>
				<Select
					value={architectureFilter}
					onChange={handleArchitectureChange}
					displayEmpty
					sx={{
						"& .MuiSelect-select": {
							fontSize: "0.813rem",
						},
					}}
				>
					<MenuItem value="all" sx={{ fontSize: "0.813rem" }}>
						All Architectures
					</MenuItem>
					{availableArchitectures.map((arch) => (
						<MenuItem key={arch} value={arch} sx={{ fontSize: "0.813rem" }}>
							{arch}
						</MenuItem>
					))}
				</Select>
			</FormControl>
		</>
	);
});
