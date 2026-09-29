// src/webview/viewport/ui/toolbar.ts
import { vscode } from "../types.js";
import { scene, setScene, viewport } from "../state.js";
import { getConfig } from "../config-store.js";
import { copySelection, cutSelection, pasteClipboard, pasteInPlace, duplicateSelection } from "../commands/clipboard.js";
import { setupHistoryKeyboardShortcuts } from "../history/history-ui.js";
import type { ShapeType } from "../../../config/config-types.js";

let currentToolbar: HTMLDivElement | null = null;
let keyboardShortcutsInstalled = false;
let openDropdown: HTMLDivElement | null = null;

export function setupToolbar(): void {
	buildToolbar();
	installKeyboardShortcutsOnce();

	window.addEventListener("theme-changed", () => rebuildToolbar());
	window.addEventListener("config-changed", () => rebuildToolbar());

	document.addEventListener(
		"click",
		(e) => {
			if (!openDropdown) return;
			const target = e.target as Node;

			if (openDropdown.contains(target)) return;

			const trigger = (target as HTMLElement).closest?.("[data-action$='-menu']");
			if (trigger) return;

			closeDropdown();
		},
		false,
	);
}

function installKeyboardShortcutsOnce(): void {
	if (keyboardShortcutsInstalled) return;
	keyboardShortcutsInstalled = true;
	setupKeyboardShortcuts();
	setupHistoryKeyboardShortcuts();
}

function buildToolbar(): HTMLDivElement {
	const config = getConfig();
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.style.top = "22px";
	toolbar.style.left = "22px";

	const isWireframe = config?.view.renderMode === "wireframe";
	const showGrid = config?.view.showGrid !== false;
	const showWorldBorder = config?.view.showWorldBorder !== false;
	const showRulers = config?.view.showRulers !== false;
	const snapGrid = scene?.snapToGrid ?? false;
	const snapObjects = config?.snapping?.enabled ?? false;
	const gizmoMode = config?.gizmo.mode ?? "world";
	const lastShape = config?.ui.lastShapeType ?? "rectangle";

	toolbar.innerHTML = `
		<div class="tb-group" data-dropdown="add">
			<button class="tb-btn tb-dropdown-trigger" data-action="add-menu">
				<span>➕ Add</span>
				<span class="tb-caret">▼</span>
			</button>
			<div class="tb-dropdown" data-menu="add">
				<div class="tb-menu-item" data-action="add-empty-object"><span class="shape-icon">◇</span> Empty Object</div>
				<div class="tb-menu-sep"></div>
				<div class="tb-menu-item" data-action="add-sprite"><span class="shape-icon">🖼️</span> Sprite</div>
				<div class="tb-menu-item" data-action="add-texture"><span class="shape-icon">📁</span> Import Texture…</div>
				<div class="tb-menu-sep"></div>
				<div class="tb-menu-item" data-action="add-shape-current"><span class="shape-icon">⬛</span> Shape (${lastShape})</div>
			</div>
		</div>

		<div class="tb-group" data-dropdown="shapes">
			<button class="tb-btn tb-dropdown-trigger" data-action="shapes-menu">
				<span>⬛ Shapes</span>
				<span class="tb-caret">▼</span>
			</button>
			<div class="tb-dropdown" data-menu="shapes">
				<div class="tb-menu-item ${lastShape === "rectangle" ? "checked" : ""}" data-shape="rectangle"><span class="shape-icon">▭</span> Rectangle</div>
				<div class="tb-menu-item ${lastShape === "circle" ? "checked" : ""}" data-shape="circle"><span class="shape-icon">●</span> Circle</div>
				<div class="tb-menu-item ${lastShape === "triangle" ? "checked" : ""}" data-shape="triangle"><span class="shape-icon">▲</span> Triangle</div>
				<div class="tb-menu-item ${lastShape === "diamond" ? "checked" : ""}" data-shape="diamond"><span class="shape-icon">◆</span> Diamond</div>
				<div class="tb-menu-item ${lastShape === "pentagon" ? "checked" : ""}" data-shape="pentagon"><span class="shape-icon">⬟</span> Pentagon</div>
				<div class="tb-menu-item ${lastShape === "hexagon" ? "checked" : ""}" data-shape="hexagon"><span class="shape-icon">⬢</span> Hexagon</div>
				<div class="tb-menu-item ${lastShape === "star" ? "checked" : ""}" data-shape="star"><span class="shape-icon">★</span> Star</div>
			</div>
		</div>

		<span class="tb-sep"></span>

		<button class="tb-btn ${showGrid ? "active" : ""}" data-action="toggle-grid" title="Toggle Grid">
			<span>⊞ Grid</span>
		</button>

		<div class="tb-group" data-dropdown="view">
			<button class="tb-btn tb-dropdown-trigger" data-action="view-menu">
				<span>👁️ View</span>
				<span class="tb-caret">▼</span>
			</button>
			<div class="tb-dropdown" data-menu="view">
				<div class="tb-menu-item ${!isWireframe ? "checked" : ""}" data-view-mode="solid">
					<span class="tb-check">${!isWireframe ? "✓" : ""}</span> Solid
				</div>
				<div class="tb-menu-item ${isWireframe ? "checked" : ""}" data-view-mode="wireframe">
					<span class="tb-check">${isWireframe ? "✓" : ""}</span> Wireframe
				</div>
				<div class="tb-menu-sep"></div>
				<div class="tb-menu-item ${showGrid ? "checked" : ""}" data-view-toggle="showGrid">
					<span class="tb-check">${showGrid ? "✓" : ""}</span> Show Grid
				</div>
				<div class="tb-menu-item ${showWorldBorder ? "checked" : ""}" data-view-toggle="showWorldBorder">
					<span class="tb-check">${showWorldBorder ? "✓" : ""}</span> Show World Border
				</div>
				<div class="tb-menu-item ${showRulers ? "checked" : ""}" data-view-toggle="showRulers">
					<span class="tb-check">${showRulers ? "✓" : ""}</span> Show Rulers
				</div>
			</div>
		</div>

		<div class="tb-group tb-segmented" title="Gizmo orientation">
			<button class="tb-seg ${gizmoMode === "world" ? "active" : ""}" data-action="gizmo-world">🌐 World</button>
			<button class="tb-seg ${gizmoMode === "object" ? "active" : ""}" data-action="gizmo-object">📦 Object</button>
		</div>

		<span class="tb-sep"></span>

		<button class="tb-btn ${snapGrid ? "active" : ""}" data-action="snap-grid" title="Snap to Grid (Toggle)">
			<span>🧲 Grid</span>
		</button>

		<button class="tb-btn ${snapObjects ? "active" : ""}" data-action="snap-objects" title="Snap to Objects (Toggle)">
			<span>🧷 Objects</span>
		</button>

		<button class="tb-btn" data-action="delete" title="Delete Selected">
			<span>🗑️</span>
		</button>

		<span class="tb-spacer"></span>

		<span id="toolbar-info"></span>
		<button class="tb-btn tb-btn-primary" data-action="save" title="Save (Ctrl+S)">
			<span>💾 Save</span>
		</button>
	`;

	toolbar.addEventListener("click", (e) => {
		const target = (e.target as HTMLElement).closest("[data-action], [data-shape], [data-view-mode], [data-view-toggle]") as HTMLElement | null;
		if (!target) return;

		const action = target.dataset.action;

		if (action === "add-menu" || action === "shapes-menu" || action === "view-menu") {
			e.stopPropagation();
			const group = target.closest(".tb-group") as HTMLElement;
			const dropdown = group.querySelector(".tb-dropdown") as HTMLDivElement;
			toggleDropdown(dropdown);
			return;
		}

		if (target.dataset.shape) {
			e.stopPropagation();
			closeDropdown();
			addShape(target.dataset.shape as ShapeType);
			return;
		}

		if (target.dataset.viewMode) {
			e.stopPropagation();
			closeDropdown();
			const mode = target.dataset.viewMode as "solid" | "wireframe";
			updateConfigPartial({ view: { renderMode: mode } });
			return;
		}

		if (target.dataset.viewToggle) {
			e.stopPropagation();
			const key = target.dataset.viewToggle as "showGrid" | "showWorldBorder" | "showRulers";
			const config = getConfig();
			const current = config?.view[key] ?? true;
			updateConfigPartial({ view: { [key]: !current } });
			closeDropdown();
			return;
		}

		switch (action) {
			case "add-empty-object":
				closeDropdown();
				addEmptyObject();
				break;
			case "add-sprite":
				closeDropdown();
				addObject("sprite");
				break;
			case "add-texture":
				closeDropdown();
				addTexture();
				break;
			case "add-shape-current": {
				closeDropdown();
				const cfg = getConfig();
				addShape(cfg?.ui.lastShapeType ?? "rectangle");
				break;
			}
			case "toggle-grid": {
				const config = getConfig();
				const next = !(config?.view.showGrid ?? true);
				updateConfigPartial({ view: { showGrid: next } });
				break;
			}
			case "gizmo-world":
				updateConfigPartial({ gizmo: { mode: "world" } });
				break;
			case "gizmo-object":
				updateConfigPartial({ gizmo: { mode: "object" } });
				break;
			case "snap-grid":
				toggleSnapGrid(target);
				break;
			case "snap-objects":
				toggleSnapObjects(target);
				break;
			case "delete":
				deleteSelection();
				break;
			case "save":
				saveScene();
				break;
		}
	});

	document.body.appendChild(toolbar);
	currentToolbar = toolbar;
	return toolbar;
}

function toggleDropdown(dropdown: HTMLDivElement): void {
	if (dropdown === openDropdown) {
		closeDropdown();
		return;
	}
	closeDropdown();
	dropdown.classList.add("open");
	openDropdown = dropdown;
}

function closeDropdown(): void {
	if (openDropdown) {
		openDropdown.classList.remove("open");
		openDropdown = null;
	}
}

function rebuildToolbar(): void {
	closeDropdown();
	if (currentToolbar && currentToolbar.parentNode) {
		currentToolbar.parentNode.removeChild(currentToolbar);
	}
	buildToolbar();
}

export function updateToolbarInfo(text: string): void {
	const el = document.getElementById("toolbar-info");
	if (el) el.textContent = text;
}

function addObject(type: "sprite" | "shape" | "text" | "group"): void {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddObject",
		objectType: type,
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

function addShape(shapeType: ShapeType): void {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddShape",
		shapeType,
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

function addTexture(): void {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddTexture",
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

/**
 * 🆕 اضافه کردن آبجکت کاملاً خالی (فقط transform)
 */
function addEmptyObject(): void {
	if (!viewport) return;
	const center = viewport.center;
	vscode.postMessage({
		type: "requestAddEmptyObject",
		x: Math.round(center.x),
		y: Math.round(center.y),
	});
}

function deleteSelection(): void {
	void import("../state.js").then((state) => {
		if (state.selectedIds.length > 0) {
			vscode.postMessage({ type: "deleteObjects", objectIds: state.selectedIds });
			void import("../selection/selection.js").then((m) => m.selectObjects([]));
		}
	});
}

/**
 * 🧲 Snap to Grid — رفتار قبلی، از scene.snapToGrid
 */
function toggleSnapGrid(button: HTMLElement): void {
	if (!scene) return;
	const next = !scene.snapToGrid;
	setScene({ ...scene, snapToGrid: next });
	button.classList.toggle("active", next);
	vscode.postMessage({ type: "updateSceneField", field: "snapToGrid", value: next, historyLabel: "toggle snap grid" });
	updateConfigPartial({ grid: { snap: next } });

	updateToolbarInfo(next ? "Snap to Grid: ON" : "Snap to Grid: OFF");
	setTimeout(() => updateToolbarInfo(""), 1200);
}

/**
 * 🧷 Snap to Objects — جدید، از config.snapping.enabled
 */
function toggleSnapObjects(button: HTMLElement): void {
	const config = getConfig();
	const current = config?.snapping?.enabled ?? false;
	const next = !current;

	button.classList.toggle("active", next);

	vscode.postMessage({
		type: "updateConfigPartial",
		partial: { snapping: { enabled: next } },
	});

	updateToolbarInfo(next ? "Snap to Objects: ON" : "Snap to Objects: OFF");
	setTimeout(() => updateToolbarInfo(""), 1200);
}

function saveScene(): void {
	if (scene) {
		vscode.postMessage({ type: "save", scene });
		updateToolbarInfo("Saved ✓");
		setTimeout(() => updateToolbarInfo(""), 1500);
	}
}

function updateConfigPartial(partial: Record<string, unknown>): void {
	vscode.postMessage({ type: "updateConfigPartial", partial });
}

function setupKeyboardShortcuts(): void {
	window.addEventListener("keydown", (e) => {
		const mod = e.ctrlKey || e.metaKey;

		if (mod && e.key === "s") {
			e.preventDefault();
			saveScene();
		} else if (mod && e.key === "c") {
			e.preventDefault();
			copySelection();
		} else if (mod && e.key === "x") {
			e.preventDefault();
			cutSelection();
		} else if (mod && e.key === "v" && e.shiftKey) {
			e.preventDefault();
			pasteInPlace();
		} else if (mod && e.key === "v") {
			e.preventDefault();
			pasteClipboard();
		} else if (mod && e.key === "d") {
			e.preventDefault();
			duplicateSelection();
		} else if (e.key === "Delete") {
			void import("../state.js").then((state) => {
				if (state.selectedIds.length > 0) {
					vscode.postMessage({ type: "deleteObjects", objectIds: state.selectedIds });
					void import("../selection/selection.js").then((m) => m.selectObjects([]));
				}
			});
		} else if (e.key === "Escape") {
			closeDropdown();
			void import("../selection/selection.js").then((m) => m.selectObjects([]));
		}
	});
}
