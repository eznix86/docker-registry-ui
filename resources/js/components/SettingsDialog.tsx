// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, Button, FormControl, Typography } from "@mui/material";
import { memo, useCallback } from "react";
import { Dialog, MenuItem, Select } from "~/components/ui";
import { useTheme } from "~/contexts/ThemeContext";
import type { ThemeName } from "~/themes/types";

const THEME_LABELS: Record<ThemeName, string> = {
	"the-hub-dark": "The Hub Dark",
	"the-hub-light": "The Hub Light",
	monokai: "Monokai",
	"nord-dark": "Nord Dark",
	"nord-light": "Nord Light",
	"one-dark": "One Dark",
	"tokyo-night": "Tokyo Night",
	cyberpunk: "Cyberpunk",
};

function SettingsDialog() {
	const { themeName, setTheme, isSettingsOpen, closeSettings } = useTheme();

	const handleThemeChange = useCallback(
		(event: { target: { value: string } }) => {
			setTheme(event.target.value as ThemeName);
		},
		[setTheme],
	);

	return (
		<Dialog
			open={isSettingsOpen}
			maxWidth="sm"
			fullWidth
			onClose={closeSettings}
		>
			<Dialog.Header>Settings</Dialog.Header>
			<Dialog.Body>
				<Box sx={{ mb: 2 }}>
					<Typography
						variant="body2"
						sx={(theme) => ({
							fontSize: theme.custom.typography.fontSizes.md,
							color: theme.palette.text.primary,
							fontWeight: theme.custom.typography.fontWeights.medium,
							mb: 1,
						})}
					>
						Theme
					</Typography>
					<FormControl fullWidth size="small">
						<Select value={themeName} onChange={handleThemeChange}>
							{Object.entries(THEME_LABELS).map(([value, label]) => (
								<MenuItem key={value} value={value}>
									{label}
								</MenuItem>
							))}
						</Select>
					</FormControl>
				</Box>
			</Dialog.Body>
			<Dialog.Footer>
				<Button variant="contained" autoFocus onClick={closeSettings}>
					Close
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}

export default memo(SettingsDialog);
