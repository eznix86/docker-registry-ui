import { useCallback, useState } from "react";
import {
	type ClipboardOptions,
	type ClipboardResult,
	copyToClipboard as copyToClipboardUtil,
} from "./clipboard";

export interface UseClipboardOptions
	extends Omit<ClipboardOptions, "onSuccess" | "onError" | "onManualCopy"> {
	resetAfter?: number; // Reset copied state after X milliseconds
}

export interface UseClipboardReturn {
	copy: (text: string) => Promise<ClipboardResult>;
	copied: boolean;
	error: string | null;
	loading: boolean;
	reset: () => void;
}

/**
 * React hook for clipboard operations with state management
 * @param options - Configuration options for the clipboard hook
 * @returns Object with copy function and state
 */
export function useClipboard(
	options: UseClipboardOptions = {},
): UseClipboardReturn {
	const { resetAfter = 2000 } = options;

	const [copied, setCopied] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	const reset = useCallback(() => {
		setCopied(false);
		setError(null);
	}, []);

	const copy = useCallback(
		async (text: string): Promise<ClipboardResult> => {
			setLoading(true);
			setError(null);
			setCopied(false);

			try {
				const result = await copyToClipboardUtil(text, {
					...options,
					onSuccess: () => {
						setCopied(true);

						// Auto-reset after specified time
						if (resetAfter > 0) {
							setTimeout(() => {
								setCopied(false);
							}, resetAfter);
						}
					},
					onError: (errorMsg, method) => {
						setError(`Copy failed (${method}): ${errorMsg}`);
					},
					onManualCopy: () => {
						setCopied(true);

						// Auto-reset after longer time for manual copy
						setTimeout(() => {
							setCopied(false);
						}, resetAfter * 2);
					},
				});

				return result;
			} finally {
				setLoading(false);
			}
		},
		[options, resetAfter],
	);

	return {
		copy,
		copied,
		error,
		loading,
		reset,
	};
}

/**
 * Simple hook that just provides the copy function with minimal state
 * @param onSuccess - Callback for successful copy
 * @param onError - Callback for copy errors
 * @returns Copy function
 */
export function useSimpleClipboard(
	onSuccess?: (method: ClipboardResult["method"]) => void,
	onError?: (error: string) => void,
): (text: string) => Promise<ClipboardResult> {
	return useCallback(
		async (text: string) => {
			return copyToClipboardUtil(text, {
				onSuccess,
				onError: (errorMsg, method) => {
					onError?.(`Copy failed using ${method}: ${errorMsg}`);
				},
			});
		},
		[onSuccess, onError],
	);
}
