// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { Box, Button, Typography } from "@mui/material"
import { memo } from "react"
import { CommandBox, Dialog, WarningBox } from "~/components/ui"
import {
	useCloseUntagDialog,
	useUntagDialogIsOpen,
	useUntagDialogRepositoryName,
} from "~/stores/untagDialogStore"

function UntagDialog() {
	const isOpen = useUntagDialogIsOpen()
	const repositoryName = useUntagDialogRepositoryName()
	const closeDialog = useCloseUntagDialog()

	return (
		<Dialog open={isOpen} maxWidth="md" fullWidth onClose={closeDialog}>
			<Dialog.Header sx={theme => ({ color: theme.palette.warning.main })}>
				Untagged Repository
			</Dialog.Header>
			<Dialog.Body>
				<Box sx={{ mb: 3 }}>
					<Typography
						variant="body1"
						sx={theme => ({
							fontSize: theme.custom.typography.fontSizes.lg,
							color: theme.palette.text.primary,
							fontWeight: theme.custom.typography.fontWeights.medium,
							mb: 2,
						})}
					>
						This repository exists in the registry but contains no tagged
						images. Repositories without tags cannot be pulled or accessed
						through standard Docker commands.
					</Typography>
				</Box>

				<WarningBox>
					<WarningBox.Title>Cleanup Instructions</WarningBox.Title>
					<WarningBox.Text>
						To remove this repository from the filesystem, execute the following
						command:
					</WarningBox.Text>

					<CommandBox.Copyable
						copyableText={`rm -rf /var/lib/registry/docker/registry/v2/repositories/${repositoryName}`}
						aria-label="Copy cleanup command"
						title={`Click to copy: rm -rf /var/lib/registry/docker/registry/v2/repositories/${repositoryName}`}
					>
						<CommandBox.Copyable.Text>
							rm -rf /var/lib/registry/docker/registry/v2/repositories/
							{repositoryName}
						</CommandBox.Copyable.Text>
						<CommandBox.Copyable.Hint className="copy-hint">
							Copy
						</CommandBox.Copyable.Hint>
					</CommandBox.Copyable>

					<WarningBox.Text sx={{ mt: 2 }}>
						After removing repositories, run garbage collection to reclaim
						storage space:
					</WarningBox.Text>

					<CommandBox.Copyable
						copyableText="registry garbage-collect /path/to/config.yml"
						aria-label="Copy garbage collect command"
						title="Click to copy: registry garbage-collect /path/to/config.yml"
					>
						<CommandBox.Copyable.Text>
							registry garbage-collect /path/to/config.yml
						</CommandBox.Copyable.Text>
						<CommandBox.Copyable.Hint className="copy-hint">
							Copy
						</CommandBox.Copyable.Hint>
					</CommandBox.Copyable>
				</WarningBox>
			</Dialog.Body>
			<Dialog.Footer>
				<Button variant="contained" autoFocus onClick={closeDialog}>
					Close
				</Button>
			</Dialog.Footer>
		</Dialog>
	)
}

export default memo(UntagDialog)
