import { create } from "zustand";

export type SnackbarSeverity = "success" | "error" | "warning" | "info";

export interface SnackbarMessage {
	id: string;
	message: string;
	severity: SnackbarSeverity;
	autoHideDuration?: number;
}

interface SnackbarStore {
	messages: SnackbarMessage[];
	showSnackbar: (
		message: string,
		severity: SnackbarSeverity,
		autoHideDuration?: number,
	) => void;
	hideSnackbar: (id: string) => void;
	clearAll: () => void;
}

export const useSnackbarStore = create<SnackbarStore>()((set, _get) => ({
	messages: [],

	showSnackbar: (
		message: string,
		severity: SnackbarSeverity,
		autoHideDuration = 6000,
	) => {
		const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
		const newMessage: SnackbarMessage = {
			id,
			message,
			severity,
			autoHideDuration,
		};

		set((state) => ({
			messages: [...state.messages, newMessage],
		}));
	},

	hideSnackbar: (id: string) => {
		set((state) => ({
			messages: state.messages.filter((msg) => msg.id !== id),
		}));
	},

	clearAll: () => {
		set({ messages: [] });
	},
}));
