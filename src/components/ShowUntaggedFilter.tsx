import { Checkbox, FormControlLabel, Typography } from "@mui/material";
import { memo, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default memo(function ShowUntaggedFilter() {
	const [searchParams, setSearchParams] = useSearchParams();
	const showUntaggedQuery = searchParams.get("showUntagged") || "false";

	const [showUntagged, setShowUntagged] = useState(
		showUntaggedQuery === "true",
	);

	const updateURL = useCallback(
		(checked: boolean) => {
			const newSearchParams = new URLSearchParams(searchParams);
			if (checked) {
				newSearchParams.set("showUntagged", "true");
			} else {
				newSearchParams.delete("showUntagged");
			}
			setSearchParams(newSearchParams, { replace: true });
		},
		[searchParams, setSearchParams],
	);

	useEffect(() => {
		const urlShowUntagged = searchParams.get("showUntagged") === "true";
		if (urlShowUntagged !== showUntagged) {
			setShowUntagged(urlShowUntagged);
		}
	}, [searchParams, showUntagged]);

	const handleShowUntaggedChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const checked = event.target.checked;
			setShowUntagged(checked);
			updateURL(checked);
		},
		[updateURL],
	);

	return (
		<FormControlLabel
			control={
				<Checkbox
					checked={showUntagged}
					onChange={handleShowUntaggedChange}
					size="small"
				/>
			}
			label={
				<Typography variant="body2" sx={{ fontSize: "0.813rem" }}>
					Show untagged repositories
				</Typography>
			}
			sx={{
				display: "flex",
				alignItems: "center",
				cursor: "pointer",
				"&:hover": {
					backgroundColor: "rgba(255, 255, 255, 0.04)",
				},
			}}
		/>
	);
});
