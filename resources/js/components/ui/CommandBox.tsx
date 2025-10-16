// SPDX-License-Identifier: Apache-2.0
// Copyright (C) 2025  Bruno Bernard

import {
	alpha,
	ButtonBase,
	Box as MuiBox,
	styled,
	Typography,
	type TypographyProps,
} from "@mui/material";
import {
	cloneElement,
	type ReactElement,
	type ReactNode,
	useState,
} from "react";

const CommandBoxRoot = styled(MuiBox)(({ theme }) => ({
	backgroundColor: alpha(theme.palette.common.black, 0.2),
	border: `1px solid ${theme.palette.divider}`,
	borderRadius: theme.spacing(0.5),
	padding: theme.spacing(1.5),
	position: "relative",
	"&::before": {
		content: '"$"',
		position: "absolute",
		left: theme.custom.spacing.commandBoxOffset,
		top: "50%",
		transform: "translateY(-50%)",
		color: theme.palette.text.disabled,
		fontFamily: theme.typography.fontFamilyMonospace,
		fontSize: theme.custom.typography.fontSizes.xl,
	},
}));

const CommandBoxText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.md,
	color: theme.palette.text.primary,
	paddingLeft: theme.spacing(2),
	wordBreak: "break-all",
	lineHeight: theme.custom.lineHeights.normal,
}));

const CopyableButton = styled(ButtonBase)(({ theme }) => ({
	backgroundColor: theme.custom.colors.background.elevated,
	border: `1px solid ${theme.custom.colors.border.light}`,
	borderRadius: theme.spacing(0.5),
	padding: theme.spacing(1.5),
	width: "auto",
	position: "relative",
	overflow: "hidden",
	display: "flex",
	alignItems: "center",
	minWidth: 0,
	"&:hover": {
		backgroundColor: theme.custom.colors.background.elevatedHover,
		"& .copy-hint": {
			opacity: theme.custom.animations.opacity.visible,
		},
	},
	"&:active": {
		transform: theme.custom.animations.scale.pressed,
	},
	transition: theme.custom.animations.transition.fast,
	[theme.breakpoints.down("sm")]: {
		padding: theme.spacing(1),
		width: "100%",
	},
}));

const CopyableText = styled(Typography)(({ theme }) => ({
	fontFamily: theme.typography.fontFamilyMonospace,
	fontSize: theme.custom.typography.fontSizes.md,
	color: theme.palette.text.primary,
	whiteSpace: "nowrap",
	overflow: "hidden",
	textOverflow: "ellipsis",
	[theme.breakpoints.down("sm")]: {
		fontSize: theme.custom.typography.fontSizes.xs,
	},
}));

const CopyHint = styled(Typography, {
	shouldForwardProp: (prop) => prop !== "copied",
})<{ copied?: boolean }>(({ theme, copied }) => ({
	display: "none",
	position: "absolute",
	right: theme.custom.spacing.commandBoxOffset,
	top: "50%",
	transform: "translateY(-50%)",
	color: theme.palette.common.white,
	fontSize: theme.custom.typography.fontSizes.md,
	fontWeight: theme.custom.typography.fontWeights.medium,
	opacity: copied
		? theme.custom.animations.opacity.visible
		: theme.custom.animations.opacity.hidden,
	transition: theme.custom.animations.transition.opacity,
	backgroundColor: copied
		? theme.palette.success.main
		: theme.palette.primary.main,
	paddingLeft: theme.spacing(1),
	paddingRight: theme.spacing(1),
	paddingTop: theme.spacing(0.5),
	paddingBottom: theme.spacing(0.5),
	borderRadius: theme.spacing(0.5),
	[theme.breakpoints.up("sm")]: {
		display: "block",
	},
}));

interface CopyableProps {
	children: ReactNode;
	copyableText: string;
	"aria-label"?: string;
	title?: string;
}

function Copyable({
	children,
	copyableText,
	"aria-label": ariaLabel,
	title,
}: CopyableProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(copyableText);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy:", err);
		}
	};

	// Clone children and pass copied state to Hint component
	const childrenWithProps = Array.isArray(children)
		? children.map((child) => {
				if (child?.type === Hint) {
					return cloneElement(child as ReactElement, { copied });
				}
				return child;
			})
		: children;

	return (
		<CopyableButton onClick={handleCopy} aria-label={ariaLabel} title={title}>
			{childrenWithProps}
		</CopyableButton>
	);
}

// Text component for use inside Copyable
function Text(props: TypographyProps) {
	return <CopyableText {...props} />;
}

// Hint component for use inside Copyable
interface HintProps extends TypographyProps {
	copied?: boolean;
}

function Hint({ copied, ...props }: HintProps) {
	return (
		<CopyHint {...props} copied={copied} className="copy-hint">
			{copied ? "Copied!" : props.children}
		</CopyHint>
	);
}

export const CommandBox = Object.assign(CommandBoxRoot, {
	Text: CommandBoxText,
	Copyable: Object.assign(Copyable, {
		Text,
		Hint,
	}),
});
