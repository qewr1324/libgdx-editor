import { selectedIds } from "../state.js";
import { vscode } from "../types.js";
import { updateToolbarInfo } from "../ui/toolbar.js";

/**
 * کپی انتخاب فعلی به clipboard مرکزی.
 * خود extension کار کپی رو انجام می‌ده.
 */
export function copySelection(): void {
	if (selectedIds.length === 0) return;
	vscode.postMessage({ type: "copyObjects", objectIds: selectedIds });
	updateToolbarInfo(`Copied ${selectedIds.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

/**
 * کات — کپی + حذف.
 */
export function cutSelection(): void {
	if (selectedIds.length === 0) return;
	vscode.postMessage({ type: "cutObjects", objectIds: selectedIds });
	updateToolbarInfo(`Cut ${selectedIds.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

/**
 * paste عادی — با offset.
 */
export function pasteClipboard(): void {
	vscode.postMessage({ type: "pasteObjects" });
}

/**
 * paste در موقعیت اصلی — بدون offset.
 */
export function pasteInPlace(): void {
	vscode.postMessage({ type: "pasteObjects", pasteInPlace: true });
}

/**
 * Duplicate (Ctrl+D) — کپی محلی بدون دست زدن به clipboard.
 */
export function duplicateSelection(): void {
	if (selectedIds.length === 0) return;
	vscode.postMessage({ type: "duplicateObjects", objectIds: selectedIds, offsetX: 20, offsetY: 20 });
	updateToolbarInfo(`Duplicated ${selectedIds.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}
