// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { memo, useCallback } from "react";
import { Checkbox, FormControlLabel, Label } from "~/components/ui";

interface ShowUntaggedFilterProps {
	checked?: boolean;
	onChange?: (checked: boolean) => void;
}

function ShowUntaggedFilter({
	checked = false,
	onChange,
}: ShowUntaggedFilterProps) {
	const handleChange = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			onChange?.(event.target.checked);
		},
		[onChange],
	);

	return (
		<FormControlLabel
			control={
				<Checkbox checked={checked} size="small" onChange={handleChange} />
			}
			label={<Label variant="body2">Show untagged repositories</Label>}
		/>
	);
}

export default memo(ShowUntaggedFilter);
