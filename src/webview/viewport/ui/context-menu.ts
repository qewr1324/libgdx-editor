import { app, viewport } from "../state.js";
import { vscode } from "../types.js";
import { copySelection, pasteClipboard, duplicateSelection } from "../commands/clipboard.js";
import { HISTORY_MENU_ITEMS, handleHistoryMenuAction } from "../history/history-ui.js";

export function setupContextMenu(): void {
	const menu = document.createElement("div");
	menu.id = "context-menu";
	menu.innerHTML = `
		<div class="context-menu-item" data-action="scene-settings">⚙️ Scene Settings</div>
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="add-sprite-here">➕ Add Sprite Here</div>
		<div class="context-menu-item" data-action="add-shape-here">⭕ Add Shape Here</div>
		<div class="context-menu-item" data-action="add-text-here">🔤 Add Text Here</div>
		<div class="context-menu-item" data-action="add-texture-here">🖼️ Add Texture Here</div>
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="copy">📋 Copy (Ctrl+C)</div>
		<div class="context-menu-item" data-action="paste">📥 Paste (Ctrl+V)</div>
		<div class="context-menu-item" data-action="duplicate">📑 Duplicate (Ctrl+D)</div>
		<div class="context-menu-separator"></div>
		${HISTORY_MENU_ITEMS}
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="delete">🗑️ Delete (Del)</div>
	`;
	menu.style.display = "none";
	document.body.appendChild(menu);

	let contextWorldX = 0;
	let contextWorldY = 0;

	app.canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		if (!viewport) return;

		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = viewport.toWorld(screenX, screenY);
		contextWorldX = Math.round(world.x);
		contextWorldY = Math.round(world.y);

		menu.style.left = `${e.clientX}px`;
		menu.style.top = `${e.clientY}px`;
		menu.style.display = "block";
	});

	document.addEventListener("click", (e) => {
		if (!menu.contains(e.target as Node)) {
			menu.style.display = "none";
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			menu.style.display = "none";
		}
	});

	menu.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;
		menu.style.display = "none";
		if (!action) return;

		// اول Undo/Redo را چک کن (از ماژول جدا)
		if (handleHistoryMenuAction(action)) return;

		handleMenuAction(action, contextWorldX, contextWorldY);
	});
}

function handleMenuAction(action: string, worldX: number, worldY: number): void {
	switch (action) {
		case "scene-settings":
			vscode.postMessage({ type: "openSceneSettings" });
			break;
		case "add-sprite-here":
			vscode.postMessage({ type: "requestAddObject", objectType: "sprite", x: worldX, y: worldY });
			break;
		case "add-shape-here":
			vscode.postMessage({ type: "requestAddObject", objectType: "shape", x: worldX, y: worldY });
			break;
		case "add-text-here":
			vscode.postMessage({ type: "requestAddObject", objectType: "text", x: worldX, y: worldY });
			break;
		case "add-texture-here":
			vscode.postMessage({ type: "requestAddTexture", x: worldX, y: worldY });
			break;
		case "copy":
			copySelection();
			break;
		case "paste":
			pasteClipboard();
			break;
		case "duplicate":
			duplicateSelection();
			break;
		case "delete":
			void import("../state.js").then((state) => {
				if (state.selectedIds.length > 0) {
					vscode.postMessage({ type: "deleteObjects", objectIds: state.selectedIds });
					void import("../selection/selection.js").then((m) => m.selectObjects([]));
				}
			});
			break;
	}
}
