// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { useAutoAnimate } from "@formkit/auto-animate/react";
import { usePage } from "@inertiajs/react";
import { Box, styled, Tooltip } from "@mui/material";
import { memo, useCallback } from "react";
import {
	Checkbox,
	Chip,
	FilterItemTitle,
	FormControlLabel,
	Label,
} from "~/components/ui";
import { useExploreFilters } from "~/hooks/useExploreFilters";
import type { ExploreProps, Registry } from "~/types";
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
	const { registries = [] } = usePage().props as ExploreProps;
	const { localRegistries, toggleRegistry } = useExploreFilters();
	const [parent] = useAutoAnimate();

	return (
		<Box>
			<FilterItemTitle variant="h6">Registries</FilterItemTitle>
			<Box ref={parent}>
				{registries.map((registry) => (
					<RegistryItemCheckbox
						key={registry.name}
						registry={registry}
						checked={localRegistries.includes(registry.name)}
						onToggle={toggleRegistry}
					/>
				))}
			</Box>
		</Box>
	);
}

export default memo(RegistryFilter);
