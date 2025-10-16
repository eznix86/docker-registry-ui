// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import { styled, Typography } from "@mui/material";
import { memo } from "react";
import { Table } from "~/components/ui";
import type { Image } from "~/types";
import { formatBytes } from "~/utils";

const DigestText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.xl,
	color: theme.palette.primary.main,
	cursor: "pointer",
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.sm,
	},
}));

const CellText = styled(Typography)(({ theme }) => ({
	color: theme.palette.text.primary,
	fontSize: theme.custom.typography.fontSizes.xl,
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.sm,
	},
}));

type Props = {
	image: Image;
	last?: boolean;
};

const RepositoryImageItem = memo(({ image, last }: Props) => {
	return (
		<Table.Row
			key={`${image.digest}-${image.os}-${image.architecture}-${image.variant}`}
			hover
			sx={{
				borderBottom: last ? 1 : 0,
				borderColor: "divider",
			}}
		>
			<Table.Cell>
				<DigestText variant="body2" title={image.digest || "Unknown"}>
					{image.digest ? image.digest.substring(0, 12) : "Unknown"}
				</DigestText>
			</Table.Cell>
			<Table.Cell>
				<CellText variant="body2">
					{image.os}/{image.architecture}
					{image.variant ? `/${image.variant}` : ""}
				</CellText>
			</Table.Cell>
			<Table.Cell>
				<CellText variant="body2">{formatBytes(image.size)}</CellText>
			</Table.Cell>
		</Table.Row>
	);
});

RepositoryImageItem.displayName = "RepositoryImageItem";

export default RepositoryImageItem;
