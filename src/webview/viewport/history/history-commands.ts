import { vscode } from "../types.js";

/**
 * ارسال پیام Undo به extension.
 */
export function sendUndo(): void {
	vscode.postMessage({ type: "undo" });
}

/**
 * ارسال پیام Redo به extension.
 */
export function sendRedo(): void {
	vscode.postMessage({ type: "redo" });
}

/**
 * بررسی می‌کند آیا کلید فشرده‌شده مربوط به Undo است یا نه.
 * Ctrl+Z (بدون Shift)
 */
export function isUndoKey(e: KeyboardEvent): boolean {
	const mod = e.ctrlKey || e.metaKey;
	return mod && e.key === "z" && !e.shiftKey;
}

/**
 * بررسی می‌کند آیا کلید فشرده‌شده مربوط به Redo است یا نه.
 * Ctrl+Y یا Ctrl+Shift+Z
 */
export function isRedoKey(e: KeyboardEvent): boolean {
	const mod = e.ctrlKey || e.metaKey;
	return mod && (e.key === "y" || (e.key === "z" && e.shiftKey));
}

/**
 * مدیریت keydown برای Undo/Redo.
 * اگر کلید مربوط بود، پیام می‌فرستد و true برمی‌گرداند.
 */
export function handleHistoryKeydown(e: KeyboardEvent): boolean {
	if (isUndoKey(e)) {
		e.preventDefault();
		sendUndo();
		return true;
	}
	if (isRedoKey(e)) {
		e.preventDefault();
		sendRedo();
		return true;
	}
	return false;
}
