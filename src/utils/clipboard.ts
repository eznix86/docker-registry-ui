/**
 * Robust clipboard utility with multiple fallback methods
 * Handles various browser environments and security contexts
 */

export interface ClipboardResult {
	success: boolean;
	method: "modern" | "fallback" | "manual" | "failed";
	error?: string;
}

export interface ClipboardOptions {
	showSuccessMessage?: boolean;
	showErrorMessage?: boolean;
	onSuccess?: (method: ClipboardResult["method"]) => void;
	onError?: (error: string, method: ClipboardResult["method"]) => void;
	onManualCopy?: (text: string) => void;
}

/**
 * Copy text to clipboard with robust fallback mechanisms
 * @param text - The text to copy to clipboard
 * @param options - Configuration options for the copy operation
 * @returns Promise with the result of the copy operation
 */
export async function copyToClipboard(
	text: string,
	options: ClipboardOptions = {},
): Promise<ClipboardResult> {
	const { onSuccess, onError, onManualCopy } = options;

	try {
		if (navigator?.clipboard?.writeText && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			onSuccess?.("modern");
			return { success: true, method: "modern" };
		}
	} catch (error) {
		console.warn("Modern clipboard API failed:", error);
	}

	try {
		const textArea = document.createElement("textarea");
		textArea.value = text;
		textArea.style.position = "fixed";
		textArea.style.left = "-999999px";
		textArea.style.top = "-999999px";
		textArea.style.opacity = "0";
		textArea.setAttribute("readonly", "");
		textArea.setAttribute("aria-hidden", "true");

		document.body.appendChild(textArea);
		textArea.focus();
		textArea.select();
		textArea.setSelectionRange(0, 99999); // For mobile devices

		try {
			const successful = document.execCommand("copy");
			if (successful) {
				onSuccess?.("fallback");
				return { success: true, method: "fallback" };
			} else {
				throw new Error("execCommand copy returned false");
			}
		} finally {
			document.body.removeChild(textArea);
		}
	} catch (fallbackError) {
		console.warn("Fallback copy method failed:", fallbackError);
	}

	try {
		showManualCopyDialog(text);
		onManualCopy?.(text);
		return { success: true, method: "manual" };
	} catch (manualError) {
		const errorMsg =
			manualError instanceof Error ? manualError.message : "Unknown error";
		console.error("Manual copy method failed:", manualError);
		onError?.(errorMsg, "failed");
		return {
			success: false,
			method: "failed",
			error: errorMsg,
		};
	}
}

/**
 * Show a dialog for manual copying when all automatic methods fail
 * @param text - The text to copy manually
 */
function showManualCopyDialog(text: string): void {
	// Use window.prompt which automatically selects the text for easy copying
	if (window.prompt) {
		window.prompt("Please select all and copy (Ctrl+C or Cmd+C):", text);
	} else {
		// Final fallback - just alert with the text
		const message = `Copy failed. Please copy the command manually:\n\n${text}`;
		alert(message);
	}
}

/**
 * Check if clipboard API is available in current environment
 * @returns Boolean indicating if modern clipboard API is available
 */
export function isClipboardAvailable(): boolean {
	return !!(
		typeof navigator?.clipboard?.writeText === "function" &&
		window.isSecureContext
	);
}

/**
 * Check if any clipboard functionality is available
 * @returns Boolean indicating if any clipboard method is available
 */
export function isAnyClipboardMethodAvailable(): boolean {
	return (
		isClipboardAvailable() ||
		typeof document !== "undefined" ||
		typeof window !== "undefined"
	);
}

/**
 * Get the most appropriate clipboard method for current environment
 * @returns String indicating the method that would be used
 */
export function getPreferredClipboardMethod(): ClipboardResult["method"] {
	if (isClipboardAvailable()) {
		return "modern";
	}
	if (
		typeof document !== "undefined" &&
		typeof document.execCommand === "function"
	) {
		return "fallback";
	}
	return "manual";
}
