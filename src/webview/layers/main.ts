import type { Layer } from "../../types/scene.js";

interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const app = document.getElementById("app")!;

let layers: Layer[] = [];
let selectedLayer: string | null = null;
let editingName: string | null = null;

function render(): void {
	const reversed = [...layers].reverse();

	app.innerHTML = `
		<div class="layers-panel">
			<div class="toolbar-inline">
				<button id="btn-add-layer">➕ New Layer</button>
				<button id="btn-delete-layer">🗑️ Delete</button>
			</div>
			<div id="layers-list">
				${reversed
					.map(
						(layer) => `
					<div class="layer-item ${layer.name === selectedLayer ? "selected" : ""} ${layer.visible ? "" : "hidden"}" data-name="${escapeAttr(layer.name)}">
						<button class="layer-icon" data-action="toggle-visibility" title="${layer.visible ? "Hide" : "Show"}">
							${layer.visible ? "👁️" : "🚫"}
						</button>
						<button class="layer-icon" data-action="toggle-lock" title="${layer.locked ? "Unlock" : "Lock"}">
							${layer.locked ? "🔒" : "🔓"}
						</button>
						<button class="layer-icon" data-action="move-up" title="Move Up">▲</button>
						<button class="layer-icon" data-action="move-down" title="Move Down">▼</button>
						<div class="layer-name" data-action="rename">
							${editingName === layer.name ? `<input type="text" value="${escapeAttr(layer.name)}" data-edit-input />` : escapeHtml(layer.name)}
						</div>
					</div>
				`,
					)
					.join("")}
			</div>
		</div>
	`;

	attachEventListeners();
}

function attachEventListeners() {
	document.getElementById("btn-add-layer")?.addEventListener("click", () => {
		vscode.postMessage({ type: "addLayer" });
	});

	document.getElementById("btn-delete-layer")?.addEventListener("click", () => {
		if (selectedLayer) {
			vscode.postMessage({ type: "deleteLayer", name: selectedLayer });
		}
	});

	const items = app.querySelectorAll<HTMLElement>(".layer-item");
	for (const item of items) {
		const name = item.dataset.name!;

		item.addEventListener("click", (e) => {
			const target = e.target as HTMLElement;
			const action = target.closest("[data-action]")?.getAttribute("data-action");

			if (action === "toggle-visibility") {
				e.stopPropagation();
				vscode.postMessage({ type: "toggleLayerVisibility", name });
			} else if (action === "toggle-lock") {
				e.stopPropagation();
				vscode.postMessage({ type: "toggleLayerLock", name });
			} else if (action === "move-up") {
				e.stopPropagation();
				vscode.postMessage({ type: "moveLayerUp", name });
			} else if (action === "move-down") {
				e.stopPropagation();
				vscode.postMessage({ type: "moveLayerDown", name });
			} else if (action === "rename") {
				editingName = name;
				render();
				requestAnimationFrame(() => {
					const input = app.querySelector<HTMLInputElement>("[data-edit-input]");
					input?.focus();
					input?.select();
				});
			} else {
				selectedLayer = name;
				vscode.postMessage({ type: "selectLayer", name });
				render();
			}
		});
	}

	const editInput = app.querySelector<HTMLInputElement>("[data-edit-input]");
	if (editInput) {
		const commit = () => {
			const newName = editInput.value.trim();
			const oldName = editingName;
			editingName = null;
			if (oldName && newName && newName !== oldName) {
				vscode.postMessage({ type: "renameLayer", oldName, newName });
			} else {
				render();
			}
		};

		editInput.addEventListener("blur", commit);
		editInput.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				e.preventDefault();
				editInput.blur();
			}
			if (e.key === "Escape") {
				editingName = null;
				render();
			}
		});
	}
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
	});
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}

window.addEventListener("message", (event) => {
	const msg = event.data;
	if (msg.type === "showLayers") {
		layers = msg.layers;
		selectedLayer = msg.selectedLayer;
		render();
	}
});

render();
vscode.postMessage({ type: "layersReady" });
