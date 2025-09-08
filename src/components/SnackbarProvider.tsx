import { Alert, Box, Snackbar, Typography } from "@mui/material";
import { useEffect } from "react";
import { type SnackbarMessage, useSnackbarStore } from "../store/snackbarStore";

export function SnackbarProvider() {
	const { messages, hideSnackbar } = useSnackbarStore();

	return (
		<>
			{messages.map((snack, index) => (
				<SnackbarAutoHide
					key={snack.id}
					snack={snack}
					index={index}
					onClose={() => hideSnackbar(snack.id)}
				/>
			))}
		</>
	);
}

function SnackbarAutoHide({
	snack,
	index,
	onClose,
}: {
	snack: SnackbarMessage;
	index: number;
	onClose: () => void;
}) {
	useEffect(() => {
		if (snack.autoHideDuration) {
			const timer = setTimeout(() => {
				onClose();
			}, snack.autoHideDuration);

			return () => clearTimeout(timer);
		}
	}, [snack.autoHideDuration, onClose]);

	const formatMessage = (message: string) => {
		const commandMatch = message.match(/(.+): "(.+)"/);
		if (commandMatch) {
			const [, beforeCommand, command] = commandMatch;
			return (
				<Box>
					<Typography variant="body2" sx={{ color: "inherit" }}>
						{beforeCommand}:
					</Typography>
					<Typography
						variant="body2"
						component="span"
						sx={{
							fontFamily: "monospace",
							bgcolor: "rgba(0,0,0,0.2)",
							px: 1,
							py: 0.5,
							mt: 0.5,
							borderRadius: 1,
							color: "inherit",
							display: "inline-block",
						}}
					>
						{command}
					</Typography>
				</Box>
			);
		}
		return (
			<Typography variant="body2" sx={{ color: "inherit" }}>
				{message}
			</Typography>
		);
	};

	return (
		<Snackbar
			open={true}
			onClose={onClose}
			anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
			sx={{
				mb: index > 0 ? 1 : 0,
				transform: `translateY(-${index * 70}px)`,
			}}
		>
			<Alert
				onClose={onClose}
				severity={snack.severity}
				variant="filled"
				sx={{
					width: "100%",
					"& .MuiAlert-message": {
						color: "inherit",
					},
				}}
			>
				{formatMessage(snack.message)}
			</Alert>
		</Snackbar>
	);
}
