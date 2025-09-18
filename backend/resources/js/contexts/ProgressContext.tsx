import { Close as CloseIcon } from "@mui/icons-material";
import {
	Box,
	IconButton,
	LinearProgress,
	Slide,
	Typography,
} from "@mui/material";
import React, {
	createContext,
	type ReactNode,
	useContext,
	useEffect,
	useState,
} from "react";

interface ProgressState {
	stage: "idle" | "catalog" | "tags" | "manifests" | "complete";
	progress: number;
	message: string;
	isActive: boolean;
	action: string;
}

interface ProgressContextType {
	progressState: ProgressState;
	startListening: () => void;
	stopListening: () => void;
}

const ProgressContext = createContext<ProgressContextType | undefined>(
	undefined,
);

export const useProgress = () => {
	const context = useContext(ProgressContext);
	if (context === undefined) {
		throw new Error("useProgress must be used within a ProgressProvider");
	}
	return context;
};

interface ProgressToastProps {
	progress: number;
	message: string;
	isVisible: boolean;
	stage: string;
	onDismiss: () => void;
}

function ProgressToast({
	progress,
	message,
	isVisible,
	stage,
	onDismiss,
}: ProgressToastProps) {
	return (
		<Slide direction="left" in={isVisible} timeout={300}>
			<Box
				sx={{
					position: "fixed",
					bottom: 24,
					right: 24,
					minWidth: 350,
					maxWidth: 450,
					p: 2,
					bgcolor: "#11151a",
					borderRadius: 1,
					boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
					border: "1px solid",
					borderColor: "#2f3336",
					zIndex: 9999,
				}}
			>
				<Box sx={{ position: "absolute", top: 4, right: 4 }}>
					<IconButton
						size="small"
						onClick={onDismiss}
						sx={{
							color: "text.secondary",
							"&:hover": { color: "text.primary" },
							padding: "2px",
						}}
					>
						<CloseIcon sx={{ fontSize: "14px" }} />
					</IconButton>
				</Box>

				<Box sx={{ pt: 2 }}>
					<LinearProgress
						variant="determinate"
						value={progress}
						sx={{
							mb: 1,
						}}
					/>

					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Typography
							variant="body2"
							sx={{
								fontSize: "0.75rem",
								color: "text.secondary",
								flex: 1,
								whiteSpace: "nowrap",
								overflow: "hidden",
								textOverflow: "ellipsis",
								mr: 1,
							}}
						>
							{message}
						</Typography>
						<Typography
							variant="body2"
							sx={{
								fontSize: "0.75rem",
								color: "primary.main",
								fontWeight: 600,
							}}
						>
							{Math.round(progress)}%
						</Typography>
					</Box>
				</Box>
			</Box>
		</Slide>
	);
}

interface ProgressProviderProps {
	children: ReactNode;
}

export function ProgressProvider({ children }: ProgressProviderProps) {
	const [progressState, setProgressState] = useState<ProgressState>({
		stage: "idle",
		progress: 0,
		message: "Ready",
		isActive: false,
		action: "",
	});
	const [eventSource, setEventSource] = useState<EventSource | null>(null);
	const [showToast, setShowToast] = useState(false);

	const startListening = () => {
		if (eventSource) {
			eventSource.close();
		}

		const es = new EventSource("/api/progress");

		es.onopen = () => {
			console.log("Progress SSE connection opened");
		};

		es.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);

				const newState = {
					stage: data.stage || "idle",
					progress: data.progress || 0,
					message: data.message || "Processing...",
					isActive: data.stage !== "idle" && data.stage !== "complete",
					action: data.action || "",
				};

				setProgressState(newState);

				// Handle open/close actions from backend
				if (data.action === "open") {
					setShowToast(true);
				} else if (data.action === "close") {
					setTimeout(() => {
						setShowToast(false);
						if (eventSource) {
							eventSource.close();
							setEventSource(null);
						}
					}, 2000);
				}
			} catch (error) {
				console.error("Failed to parse progress data:", error);
			}
		};

		es.onerror = (error) => {
			console.error("Progress SSE error:", error);
			es.close();
			setEventSource(null);
			setShowToast(false);

			setProgressState({
				stage: "idle",
				progress: 0,
				message: "Connection error",
				isActive: false,
				action: "",
			});
		};

		setEventSource(es);
	};

	const stopListening = () => {
		if (eventSource) {
			eventSource.close();
			setEventSource(null);
		}

		setShowToast(false);
		setProgressState({
			stage: "idle",
			progress: 0,
			message: "Ready",
			isActive: false,
			action: "",
		});
	};

	const handleDismiss = () => {
		setShowToast(false);
	};

	useEffect(() => {
		return () => {
			stopListening();
		};
	}, []);

	return (
		<ProgressContext.Provider
			value={{ progressState, startListening, stopListening }}
		>
			{children}
			<ProgressToast
				progress={progressState.progress}
				message={progressState.message}
				isVisible={showToast}
				stage={progressState.stage}
				onDismiss={handleDismiss}
			/>
		</ProgressContext.Provider>
	);
}
