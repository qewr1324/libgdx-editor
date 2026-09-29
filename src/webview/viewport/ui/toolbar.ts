import { vscode } from "../types.js";
import { scene, setScene, levelConfig, setLevelConfig, viewport } from "../state.js";
import { copySelection, pasteClipboard, duplicateSelection } from "../commands/clipboard.js";
import { setupHistoryKeyboardShortcuts } from "../history/history-ui.js";
import { redrawGrid } from "../render/grid.js";
import type { ShapeType } from "../../../types/level-config.js";

let currentToolbar: HTMLDivElement | null = null;
let keyboardShortcutsInstalled = false;
let openDropdown: HTMLDivElement | null = null;

export function setupToolbar(): void {
	buildToolbar();
	installKeyboardShortcutsOnce();

	window.addEventListener("theme-changed", () => {
		rebuildToolbar();
	});

	// بستن dropdown ها با کلیک بیرون
	document.addEventListener("click", (e) => {
		if (openDropdown && !openDropdown.contains(e.target as Node)) {
			closeDropdown();
		}
	});
}

function installKeyboardShortcutsOnce(): void {
	if (keyboardShortcutsInstalled) return;
	keyboardShortcutsInstalled = true;
	setupKeyboardShortcuts();
	setupHistoryKeyboardShortcuts();
}

function buildToolbar(): HTMLDivElement {
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.style.top = "22px";
	toolbar.style.left = "22px";

	const isWireframe = levelConfig?.view.renderMode === "wireframe";
	const showGrid = levelConfig?.view.showGrid !== false;
	const snapGrid = scene?.snapToGrid ?? false;
	const gizmoMode = levelConfig?.gizmo.mode ?? "world";

	toolbar.innerHTML = `
		<!-- ============ Sprite ============ -->
		<div class="tb-group" data-dropdown="sprite">
			<button class="tb-btn tb-dropdown-trigger" data-action="sprite-menu">
				<span>🖼️ Sprite</span>
				<span class="tb-caret">▼</span>
			</button>
			<div class="tb-dropdown" data-menu="sprite">
				<div class="tb-menu-item" data-action="add-sprite">➕ Add Sprite at Center</div>
				<div class="tb-menu-item" data-action="add-texture">📁 Import Texture…</div>
			</div>
		</div>

		<!-- ============ Shapes ============ -->
		<div class="tb-group" data-dropdown="shapes">
			<button class="tb-btn tb-dropdown-trigger" data-action="shapes-menu">
				<span>⬛ Shapes</span>
				<span class="tb-caret">▼</span>
			</button>
			<div class="tb-dropdown" data-menu="shapes">
				<div class="tb-menu-item" data-shape="rectangle"><span class="shape-icon">▭</span> Rectangle</div>
				<div class="tb-menu-item" data-shape="circle"><span class="shape-icon">●</span> Circle</div>
				<div class="tb-menu-item" data-shape="triangle"><span class="shape-icon">▲</span> Triangle</div>
				<div class="tb-menu-item" data-shape="diamond"><span class="shape-icon">◆</span> Diamond</div>
				<div class="tb-menu-item" data-shape="pentagon"><span class="shape-icon">⬟</span> Pentagon</div>
				<div class="tb-menu-item" data-shape="hexagon"><span class="shape-icon">⬢</span> Hexagon</div>
				<div class="tb-menu-item" data-shape="star"><span class="shape-icon">★</span> Star</div>
			</div>
		</div>

		<span class="tb-sep"></span>

		<!-- ============ Grid ============ -->
		<button class="tb-btn ${showGrid ? "active" : ""}" data-action="toggle-grid" title="Toggle Grid">
			<span>⊞ Grid</span>
		</button>

		<!-- ============ View Options ============ -->
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
				<div class="tb-menu-item" data-view-toggle="showWorldBorder">
					<span class="tb-check">✓</span> Show World Border
				</div>
				<div class="tb-menu-item" data-view-toggle="showRulers">
					<span class="tb-check">✓</span> Show Rulers
				</div>
			</div>
		</div>

		<!-- ============ Gizmo Mode (World/Object) ============ -->
		<div class="tb-group tb-segmented" title="Gizmo orientation">
			<button class="tb-seg ${gizmoMode === "world" ? "active" : ""}" data-action="gizmo-world">🌐 World</button>
			<button class="tb-seg ${gizmoMode === "object" ? "active" : ""}" data-action="gizmo-object">📦 Object</button>
		</div>

		<span class="tb-sep"></span>

		<!-- ============ Snap ============ -->
		<button class="tb-btn ${snapGrid ? "active" : ""}" data-action="snap-grid" title="Snap to Grid">
			<span>🧲 Snap</span>
		</button>

		<!-- ============ Delete ============ -->
		<button class="tb-btn" data-action="delete" title="Delete Selected">
			<span>🗑️</span>
		</button>

		<span class="tb-spacer"></span>

		<!-- ============ Info + Save ============ -->
		<span id="toolbar-info"></span>
		<button class="tb-btn tb-btn-primary" data-action="save" title="Save (Ctrl+S)">
			<span>💾 Save</span>
		</button>
	`;

	toolbar.addEventListener("click", (e) => {
		const target = (e.target as HTMLElement).closest("[data-action], [data-shape], [data-view-mode], [data-view-toggle]") as HTMLElement | null;
		if (!target) return;

		// dropdown trigger
		const action = target.dataset.action;
		if (action === "sprite-menu" || action === "shapes-menu" || action === "view-menu") {
			const group = target.closest(".tb-group") as HTMLElement;
			const dropdown = group.querySelector(".tb-dropdown") as HTMLDivElement;
			toggleDropdown(dropdown);
			return;
		}

		// menu item: shape
		if (target.dataset.shape) {
			closeDropdown();
			addShape(target.dataset.shape as ShapeType);
			return;
		}

		// menu item: view mode
		if (target.dataset.viewMode) {
			closeDropdown();
			const mode = target.dataset.viewMode as "solid" | "wireframe";
			updateLevelConfigPartial({ view: { renderMode: mode } });
			return;
		}

		// menu item: view toggle
		if (target.dataset.viewToggle) {
			const key = target.dataset.viewToggle as "showGrid" | "showWorldBorder" | "showRulers";
			// toggle — مقدار فعلی را از config بگیر
			const current = levelConfig?.view[key];
			updateLevelConfigPartial({ view: { [key]: !current } });
			closeDropdown();
			return;
		}

		// toolbar button actions
		switch (action) {
			case "add-sprite":
				closeDropdown();
				addObject("sprite");
				break;
			case "add-texture":
				closeDropdown();
				addTexture();
				break;
			case "toggle-grid": {
				const next = !(levelConfig?.view.showGrid ?? true);
				updateLevelConfigPartial({ view: { showGrid: next } });
				break;
			}
			case "gizmo-world":
				updateLevelConfigPartial({ gizmo: { mode: "world" } });
				break;
			case "gizmo-object":
				updateLevelConfigPartial({ gizmo: { mode: "object" } });
				break;
			case "snap-grid":
				toggleSnapGrid(target);
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

// ---------- Actions ----------

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

function deleteSelection(): void {
	void import("../state.js").then((state) => {
		if (state.selectedIds.length > 0) {
			vscode.postMessage({ type: "deleteObjects", objectIds: state.selectedIds });
			void import("../selection/selection.js").then((m) => m.selectObjects([]));
		}
	});
}

function toggleSnapGrid(button: HTMLElement): void {
	if (!scene) return;
	const next = !scene.snapToGrid;
	setScene({ ...scene, snapToGrid: next });
	button.classList.toggle("active", next);
	vscode.postMessage({ type: "updateSceneField", field: "snapToGrid", value: next, historyLabel: "toggle snap" });
	// ذخیره در level config
	updateLevelConfigPartial({ grid: { snap: next } });
}

function saveScene(): void {
	if (scene) {
		vscode.postMessage({ type: "save", scene });
		updateToolbarInfo("Saved ✓");
		setTimeout(() => updateToolbarInfo(""), 1500);
	}
}

// ---------- Level Config ----------

function updateLevelConfigPartial(partial: Record<string, unknown>): void {
	vscode.postMessage({ type: "updateLevelConfig", partial });
}

/**
 * ✅ از messages.ts صدا زده می‌شود وقتی levelConfigLoaded/levelConfigUpdated می‌آید.
 */
export function applyLevelConfigToUI(): void {
	if (!currentToolbar) return;
	// بازسازی toolbar تا وضعیت‌ها آپدیت شوند
	rebuildToolbar();
}

// ---------- Keyboard ----------

function setupKeyboardShortcuts(): void {
	window.addEventListener("keydown", (e) => {
		const mod = e.ctrlKey || e.metaKey;

		if (mod && e.key === "s") {
			e.preventDefault();
			saveScene();
		} else if (mod && e.key === "c") {
			e.preventDefault();
			copySelection();
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
