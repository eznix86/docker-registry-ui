// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { memo } from "react";
import { Checkbox, FormControlLabel, Label } from "~/components/ui";
import { useFilterStore } from "~/stores/filterStore";

function ShowUntaggedFilter() {
	const selectedShowUntagged = useFilterStore(
		(state) => state.selectedShowUntagged,
	);
	const toggleShowUntagged = useFilterStore(
		(state) => state.toggleShowUntagged,
	);

	return (
		<FormControlLabel
			control={
				<Checkbox
					checked={selectedShowUntagged}
					size="small"
					onChange={toggleShowUntagged}
				/>
			}
			label={<Label variant="body2">Show untagged repositories</Label>}
		/>
	);
}

export default memo(ShowUntaggedFilter);
