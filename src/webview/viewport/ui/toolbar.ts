import { vscode } from "../types.js";
import { scene, setScene } from "../state.js";
import { copySelection, pasteClipboard, duplicateSelection } from "../commands/clipboard.js";

export function setupToolbar(): void {
	const toolbar = document.createElement("div");
	toolbar.id = "toolbar";
	toolbar.style.top = "22px";
	toolbar.style.left = "22px";
	toolbar.innerHTML = `
		<button data-action="add-sprite" title="Add Sprite">➕ Sprite</button>
		<button data-action="add-shape" title="Add Shape">⭕ Shape</button>
		<button data-action="add-text" title="Add Text">🔤 Text</button>
		<button data-action="add-texture" title="Add Texture from file">🖼️ Texture</button>
		<button data-action="delete" title="Delete Selected">🗑️ Delete</button>
		<button data-action="snap-grid" title="Snap to Grid">▦ Grid</button>
		<button data-action="save" title="Save (Ctrl+S)">💾 Save</button>
		<span id="toolbar-info"></span>
	`;
	document.body.appendChild(toolbar);

	toolbar.addEventListener("click", (e) => {
		const target = e.target as HTMLButtonElement;
		const action = target.dataset.action;
		if (!action) return;

		switch (action) {
			case "add-sprite":
				addObject("sprite");
				break;
			case "add-shape":
				addObject("shape");
				break;
			case "add-text":
				addObject("text");
				break;
			case "add-texture":
				addTexture();
				break;
			case "delete":
				deleteSelection();
				break;
			case "snap-grid":
				toggleSnapGrid(target);
				break;
			case "save":
				saveScene();
				break;
		}
	});

	setupKeyboardShortcuts();
}

export function updateToolbarInfo(text: string): void {
	const el = document.getElementById("toolbar-info");
	if (el) el.textContent = text;
}

function addObject(type: "sprite" | "shape" | "text" | "group"): void {
	void import("../pixi/setup.js").then(() => {
		void import("../state.js").then((state) => {
			const center = state.viewport.center;
			vscode.postMessage({
				type: "requestAddObject",
				objectType: type,
				x: Math.round(center.x),
				y: Math.round(center.y),
			});
		});
	});
}

function addTexture(): void {
	void import("../state.js").then((state) => {
		const center = state.viewport.center;
		vscode.postMessage({
			type: "requestAddTexture",
			x: Math.round(center.x),
			y: Math.round(center.y),
		});
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

function toggleSnapGrid(button: HTMLButtonElement): void {
	if (!scene) return;
	setScene({ ...scene, snapToGrid: !scene.snapToGrid });
	button.classList.toggle("active", scene.snapToGrid);
	vscode.postMessage({ type: "updateSceneField", field: "snapToGrid", value: scene.snapToGrid, historyLabel: "toggle snap" });
}

function saveScene(): void {
	if (scene) {
		vscode.postMessage({ type: "save", scene });
		updateToolbarInfo("Saved ✓");
		setTimeout(() => updateToolbarInfo(""), 1500);
	}
}

function setupKeyboardShortcuts(): void {
	window.addEventListener("keydown", (e) => {
		const mod = e.ctrlKey || e.metaKey;

		if (mod && e.key === "s") {
			e.preventDefault();
			saveScene();
		} else if (mod && e.key === "z" && !e.shiftKey) {
			e.preventDefault();
			vscode.postMessage({ type: "undo" });
		} else if (mod && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
			e.preventDefault();
			vscode.postMessage({ type: "redo" });
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
			void import("../selection/selection.js").then((m) => m.selectObjects([]));
		}
	});
}
