// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, styled } from "@mui/material";
import { memo, useCallback } from "react";
import {
	Checkbox,
	FilterTitle,
	FormControlLabel,
	Label,
} from "~/components/ui";

interface Source {
	key: string;
	host: string;
}

interface SourcesFilterProps {
	sources?: Source[];
	selected?: string[];
	onToggle?: (host: string) => void;
}

const SourceItem = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	marginBottom: theme.spacing(0.5),
}));

const StyledFormControlLabel = styled(FormControlLabel)(({ theme }) => ({
	flexGrow: 1,
	marginRight: theme.spacing(1),
}));

interface SourceItemCheckboxProps {
	source: Source;
	isChecked: boolean;
	onToggle: (host: string) => void;
}

const SourceItemCheckbox = memo(
	({ source, isChecked, onToggle }: SourceItemCheckboxProps) => {
		const handleChange = useCallback(() => {
			onToggle(source.host);
		}, [onToggle, source.host]);

		return (
			<SourceItem>
				<StyledFormControlLabel
					control={
						<Checkbox
							checked={isChecked}
							size="small"
							onChange={handleChange}
						/>
					}
					label={<Label>{source.host}</Label>}
				/>
			</SourceItem>
		);
	},
);

SourceItemCheckbox.displayName = "SourceItemCheckbox";

function SourcesFilter({
	sources = [
		{ key: "docker-hub", host: "registry.hub.docker.com" },
		{ key: "local", host: "localhost:5000" },
	],
	selected = [],
	onToggle,
}: SourcesFilterProps) {
	const handleToggle = useCallback(
		(host: string) => {
			onToggle?.(host);
		},
		[onToggle],
	);

	return (
		<Box>
			<FilterTitle variant="h6">Sources</FilterTitle>
			{sources.map((source) => (
				<SourceItemCheckbox
					key={source.key}
					source={source}
					isChecked={selected.includes(source.host)}
					onToggle={handleToggle}
				/>
			))}
		</Box>
	);
}

export default memo(SourcesFilter);
