import { clipboard, scene, selectedIds, setClipboard } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { findObject } from "../utils/geometry.js";
import { vscode } from "../types.js";
import { updateToolbarInfo } from "../ui/toolbar.js";

export function copySelection(): void {
	if (selectedIds.length === 0 || !scene) return;
	const items: GameObject[] = [];
	for (const id of selectedIds) {
		const obj = findObject(scene, id);
		if (obj) items.push(structuredClone(obj) as GameObject);
	}
	setClipboard(items);
	updateToolbarInfo(`Copied ${items.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

export function pasteClipboard(): void {
	if (clipboard.length === 0) return;
	const offsetX = 20;
	const offsetY = 20;
	for (const obj of clipboard) {
		obj.transform.x += offsetX;
		obj.transform.y += offsetY;
	}
	for (const obj of clipboard) {
		const clone = structuredClone(obj) as GameObject;
		clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		clone.name = `${obj.name}_copy`;
		vscode.postMessage({ type: "updateObject", object: clone, historyLabel: "paste" });
	}
	updateToolbarInfo(`Pasted ${clipboard.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}

export function duplicateSelection(): void {
	if (selectedIds.length === 0) return;
	vscode.postMessage({ type: "duplicateObjects", objectIds: selectedIds, offsetX: 20, offsetY: 20 });
	updateToolbarInfo(`Duplicated ${selectedIds.length} object(s)`);
	setTimeout(() => updateToolbarInfo(""), 1500);
}
