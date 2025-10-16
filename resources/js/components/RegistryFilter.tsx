// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, styled, Tooltip } from "@mui/material";
import { memo, useCallback, useMemo, useRef } from "react";
import {
	Checkbox,
	Chip,
	FilterItemTitle,
	FormControlLabel,
	Label,
} from "~/components/ui";
import { useFilterStore } from "~/stores/filterStore";
import type { Registry } from "~/types";
import { getRegistryStatus, isRegistryHealthy } from "~/utils/registryStatus";

const RegistryItem = styled(Box)(({ theme }) => ({
	display: "flex",
	alignItems: "center",
	marginBottom: theme.spacing(0.5),
}));

const StyledFormControlLabel = styled(FormControlLabel, {
	shouldForwardProp: (prop) => prop !== "isUnhealthy",
})<{ isUnhealthy?: boolean }>(({ theme, isUnhealthy }) => ({
	flexGrow: 1,
	marginRight: theme.spacing(1),
	textDecoration: isUnhealthy ? "line-through" : "none",
	opacity: isUnhealthy ? 0.6 : 1,
}));

interface RegistryItemCheckboxProps {
	registry: Registry;
	checked: boolean;
	onToggle: (registry: string) => void;
}

const RegistryItemCheckbox = memo(
	({ registry, checked, onToggle }: RegistryItemCheckboxProps) => {
		const handleChange = useCallback(() => {
			onToggle(registry.name);
		}, [registry.name, onToggle]);

		const isHealthy = isRegistryHealthy(registry.status);
		const statusInfo = getRegistryStatus(registry.status);

		return (
			<RegistryItem>
				<StyledFormControlLabel
					control={
						<Checkbox checked={checked} size="small" onChange={handleChange} />
					}
					label={<Label>{registry.host}</Label>}
					isUnhealthy={!isHealthy}
				/>
				{!isHealthy && (
					<Tooltip
						title={
							<Box>
								<Box sx={{ fontWeight: "bold", mb: 0.5 }}>
									{statusInfo.code} - {statusInfo.message}
								</Box>
								<Box>{statusInfo.description}</Box>
							</Box>
						}
						arrow
					>
						<span>
							<Chip
								label={statusInfo.code}
								variant="warning"
								size="small"
								sx={{ cursor: "help" }}
							/>
						</span>
					</Tooltip>
				)}
			</RegistryItem>
		);
	},
);

RegistryItemCheckbox.displayName = "RegistryItemCheckbox";

function RegistryFilter() {
	const localRegistries = useFilterStore((state) => state.localRegistries);
	const selectedRegistries = useFilterStore(
		(state) => state.selectedRegistries,
	);
	const toggleRegistry = useFilterStore((state) => state.toggleRegistry);

	// Removed useAutoAnimate - animation was causing 21ms of layout/GPU overhead
	const parent = useRef(null);

	// Optimize includes() check with Set for O(1) lookup instead of O(n)
	const selectedSet = useMemo(
		() => new Set(selectedRegistries),
		[selectedRegistries],
	);

	return (
		<Box>
			<FilterItemTitle variant="h6">Registries</FilterItemTitle>
			<Box ref={parent}>
				{localRegistries.map((registry) => (
					<RegistryItemCheckbox
						key={registry.name}
						registry={registry}
						checked={selectedSet.has(registry.name)}
						onToggle={toggleRegistry}
					/>
				))}
			</Box>
		</Box>
	);
}

export default memo(RegistryFilter);
