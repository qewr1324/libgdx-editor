// src/webview/viewport/ui/context-menu.ts
import { app, viewport, scene } from "../state.js";
import { vscode } from "../types.js";
import { copySelection, pasteClipboard, duplicateSelection } from "../commands/clipboard.js";
import { HISTORY_MENU_ITEMS, handleHistoryMenuAction } from "../history/history-ui.js";

let currentMenu: HTMLDivElement | null = null;
let contextWorldX = 0;
let contextWorldY = 0;
let globalListenersInstalled = false;

// ============================================================
// Setup
// ============================================================

export function setupContextMenu(): void {
	buildContextMenu();

	window.addEventListener("theme-changed", () => {
		rebuildContextMenu();
	});

	// 🆕 global listeners فقط یک بار
	installGlobalListeners();

	// 🆕 contextmenu listener روی canvas
	setupCanvasContextMenu();
}

// ============================================================
// Canvas context menu trigger
// ============================================================

function setupCanvasContextMenu(): void {
	app.canvas.addEventListener("contextmenu", (e) => {
		e.preventDefault();
		if (!viewport) return;

		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = viewport.toWorld(screenX, screenY);
		contextWorldX = Math.round(world.x);
		contextWorldY = Math.round(world.y);

		// rebuild menu چون ممکنه reference اضافه/حذف شده باشه
		rebuildContextMenu();

		// 🆕 از currentMenu استفاده کن
		const m = currentMenu;
		if (!m) return;

		m.style.left = `${e.clientX}px`;
		m.style.top = `${e.clientY}px`;
		m.style.display = "block";
	});
}

// ============================================================
// Global listeners (فقط یک بار)
// ============================================================

function installGlobalListeners(): void {
	if (globalListenersInstalled) return;
	globalListenersInstalled = true;

	document.addEventListener("click", (e) => {
		const m = currentMenu;
		if (!m) return;
		if (!m.contains(e.target as Node)) {
			m.style.display = "none";
		}
	});

	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") {
			const m = currentMenu;
			if (m) m.style.display = "none";
		}
	});
}

// ============================================================
// Build menu
// ============================================================

function buildContextMenu(): HTMLDivElement {
	const menu = document.createElement("div");
	menu.id = "context-menu";

	const hasReference = !!scene?.referenceImage;

	menu.innerHTML = `
		<div class="context-menu-item" data-action="scene-settings">⚙️ Scene Settings</div>
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="add-empty-here">◇ Add Empty Object Here</div>
		<div class="context-menu-item" data-action="add-sprite-here">➕ Add Sprite Here</div>
		<div class="context-menu-item" data-action="add-atlas-here">🗺️ Add Atlas Here</div>
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
		${
			hasReference
				? `
		<div class="context-menu-separator"></div>
		<div class="context-menu-item" data-action="toggle-reference">👁️ Toggle Reference Visibility</div>
		<div class="context-menu-item" data-action="remove-reference">❌ Remove Reference Image</div>
		`
				: ""
		}
	`;

	menu.style.display = "none";
	menu.style.position = "fixed";
	menu.style.zIndex = "9999";

	document.body.appendChild(menu);

	// 🆕 click handler فقط روی همین menu (نه global)
	menu.addEventListener("click", (e) => {
		const target = e.target as HTMLElement;
		const action = target.dataset.action;

		const m = currentMenu;
		if (m) m.style.display = "none";

		if (!action) return;
		if (handleHistoryMenuAction(action)) return;

		handleMenuAction(action, contextWorldX, contextWorldY);
	});

	currentMenu = menu;
	return menu;
}

// ============================================================
// Rebuild
// ============================================================

function rebuildContextMenu(): void {
	if (currentMenu && currentMenu.parentNode) {
		currentMenu.parentNode.removeChild(currentMenu);
	}
	currentMenu = null;
	buildContextMenu();
}

// ============================================================
// Handle actions
// ============================================================

function handleMenuAction(action: string, worldX: number, worldY: number): void {
	switch (action) {
		case "scene-settings":
			vscode.postMessage({ type: "openSceneSettings" });
			break;
		case "add-empty-here":
			vscode.postMessage({ type: "requestAddEmptyObject", x: worldX, y: worldY });
			break;
		case "add-sprite-here":
			vscode.postMessage({ type: "requestAddObject", objectType: "sprite", x: worldX, y: worldY });
			break;
		case "add-atlas-here":
			vscode.postMessage({ type: "requestAddAtlas", x: worldX, y: worldY });
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
		case "toggle-reference":
			vscode.postMessage({ type: "toggleReferenceHidden" });
			break;
		case "remove-reference":
			vscode.postMessage({ type: "removeReferenceImage" });
			break;
	}
}
