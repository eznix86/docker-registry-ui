import { Box, Checkbox, FormControlLabel, Typography } from "@mui/material";
import { memo, useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useFilter } from "../contexts/FilterContext";

export default memo(function SourcesFilter() {
	const { availableSources } = useFilter();
	const [searchParams, setSearchParams] = useSearchParams();

	const selectedSources = useMemo(() => {
		const sourcesQuery = searchParams.get("sources") || "";
		return sourcesQuery ? sourcesQuery.split(",") : [];
	}, [searchParams]);

	const handleSourceToggle = useCallback(
		(sourceHost: string) => {
			const newSearchParams = new URLSearchParams(searchParams);
			const currentSources = searchParams.get("sources");
			const currentSourcesArray = currentSources
				? currentSources.split(",")
				: [];

			let newSources: string[];
			if (currentSourcesArray.includes(sourceHost)) {
				newSources = currentSourcesArray.filter((s) => s !== sourceHost);
			} else {
				newSources = [...currentSourcesArray, sourceHost];
			}

			if (newSources.length > 0) {
				newSearchParams.set("sources", newSources.join(","));
			} else {
				newSearchParams.delete("sources");
			}

			setSearchParams(newSearchParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	return (
		<Box>
			<Typography
				variant="h6"
				gutterBottom
				sx={{ fontSize: "0.875rem", fontWeight: 600 }}
			>
				Sources
			</Typography>
			{availableSources.map((source) => (
				<Box
					key={source.key}
					sx={{ display: "flex", alignItems: "center", mb: 0.5 }}
				>
					<FormControlLabel
						control={
							<Checkbox
								checked={selectedSources.includes(source.host)}
								onChange={() => handleSourceToggle(source.host)}
								size="small"
								sx={{
									color: "primary.main",
									"&.Mui-checked": {
										color: "primary.main",
									},
								}}
							/>
						}
						label={
							<Typography
								sx={{
									fontSize: "0.875rem",
									color: "text.primary",
								}}
							>
								{source.host}
							</Typography>
						}
						sx={{ flexGrow: 1, mr: 1 }}
					/>
				</Box>
			))}
		</Box>
	);
});
