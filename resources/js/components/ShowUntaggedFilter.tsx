// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { memo } from "react";
import { Checkbox, FormControlLabel, Label } from "~/components/ui";
import { useExploreFilters } from "~/hooks/useExploreFilters";

function ShowUntaggedFilter() {
	const { filters, toggleShowUntagged } = useExploreFilters();

	return (
		<FormControlLabel
			control={
				<Checkbox
					checked={filters.showUntagged}
					size="small"
					onChange={toggleShowUntagged}
				/>
			}
			label={<Label variant="body2">Show untagged repositories</Label>}
		/>
	);
}

export default memo(ShowUntaggedFilter);
