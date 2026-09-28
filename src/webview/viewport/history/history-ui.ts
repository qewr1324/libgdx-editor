import { handleHistoryKeydown, sendUndo, sendRedo } from "./history-commands.js";

/**
 * آیتم‌های HTML مربوط به Undo/Redo در context menu.
 */
export const HISTORY_MENU_ITEMS = `
	<div class="context-menu-item" data-action="undo">↶ Undo (Ctrl+Z)</div>
	<div class="context-menu-item" data-action="redo">↷ Redo (Ctrl+Y)</div>
`;

/**
 * پردازش کلیک روی آیتم‌های Undo/Redo در context menu.
 * اگر action مربوط بود، true برمی‌گرداند.
 */
export function handleHistoryMenuAction(action: string): boolean {
	if (action === "undo") {
		sendUndo();
		return true;
	}
	if (action === "redo") {
		sendRedo();
		return true;
	}
	return false;
}

/**
 * راه‌اندازی keyboard shortcut های Undo/Redo.
 */
export function setupHistoryKeyboardShortcuts(): void {
	window.addEventListener("keydown", (e) => {
		handleHistoryKeydown(e);
	});
}

/**
 * دکمه‌های Undo/Redo برای toolbar (اختیاری).
 */
export const HISTORY_TOOLBAR_BUTTONS = `
	<button data-action="undo" title="Undo (Ctrl+Z)">↶</button>
	<button data-action="redo" title="Redo (Ctrl+Y)">↷</button>
`;

/**
 * پردازش کلیک روی دکمه‌های Undo/Redo در toolbar.
 */
export function handleHistoryToolbarAction(action: string): boolean {
	if (action === "undo") {
		sendUndo();
		return true;
	}
	if (action === "redo") {
		sendRedo();
		return true;
	}
	return false;
}
