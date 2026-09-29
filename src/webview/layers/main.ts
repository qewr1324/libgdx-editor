// src/webview/layers/main.ts
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
let dragSourceIndex: number | null = null;
let dragOverIndex: number | null = null;

function render(): void {
	const reversed = [...layers].reverse();

	app.innerHTML = `
		<div class="layers-panel">
			<div class="layers-toolbar">
				<button class="layers-btn" id="btn-add-layer" title="New Layer">➕</button>
				<button class="layers-btn" id="btn-delete-layer" title="Delete Selected Layer">🗑️</button>
				<span class="layers-count">${layers.length} layer${layers.length === 1 ? "" : "s"}</span>
			</div>
			<div id="layers-list">
				${reversed
					.map((layer, revIdx) => {
						const realIdx = layers.length - 1 - revIdx;
						const isSelected = layer.name === selectedLayer;
						const isDragging = dragSourceIndex === realIdx;
						const isDragOver = dragOverIndex === realIdx && dragSourceIndex !== realIdx;
						const objCount = layer.objects.length;

						return `
						<div
							class="layer-item ${isSelected ? "selected" : ""} ${layer.visible ? "" : "is-hidden"} ${layer.locked ? "is-locked" : ""} ${isDragging ? "dragging" : ""} ${isDragOver ? "drag-over" : ""}"
							data-name="${escapeAttr(layer.name)}"
							data-index="${realIdx}"
							draggable="true"
						>
							<span class="layer-drag-handle" title="Drag to reorder">⋮⋮</span>
							<button class="layer-icon" data-action="toggle-visibility" title="${layer.visible ? "Hide" : "Show"}">
								${layer.visible ? "👁️" : "🚫"}
							</button>
							<button class="layer-icon" data-action="toggle-lock" title="${layer.locked ? "Unlock" : "Lock"}">
								${layer.locked ? "🔒" : "🔓"}
							</button>
							<div class="layer-name" data-action="rename">
								${editingName === layer.name ? `<input type="text" value="${escapeAttr(layer.name)}" data-edit-input />` : `${escapeHtml(layer.name)}<span class="layer-obj-count">${objCount}</span>`}
							</div>
							<button class="layer-icon" data-action="move-up" title="Move Up">▲</button>
							<button class="layer-icon" data-action="move-down" title="Move Down">▼</button>
						</div>
					`;
					})
					.join("")}
			</div>
		</div>
	`;

	attachEventListeners();
	attachDragHandlers();
}

function attachEventListeners(): void {
	document.getElementById("btn-add-layer")?.addEventListener("click", () => {
		vscode.postMessage({ type: "addLayer" });
	});

	document.getElementById("btn-delete-layer")?.addEventListener("click", () => {
		if (!selectedLayer) return;
		vscode.postMessage({ type: "deleteLayer", name: selectedLayer });
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

function attachDragHandlers(): void {
	const items = app.querySelectorAll<HTMLElement>(".layer-item");

	for (const item of items) {
		item.addEventListener("dragstart", (e) => {
			dragSourceIndex = Number.parseInt(item.dataset.index!, 10);
			item.classList.add("dragging");
			if (e.dataTransfer) {
				e.dataTransfer.effectAllowed = "move";
				e.dataTransfer.setData("text/plain", item.dataset.name!);
			}
		});

		item.addEventListener("dragend", () => {
			dragSourceIndex = null;
			dragOverIndex = null;
			render();
		});

		item.addEventListener("dragover", (e) => {
			e.preventDefault();
			if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
			const idx = Number.parseInt(item.dataset.index!, 10);
			if (dragOverIndex !== idx) {
				dragOverIndex = idx;
				app.querySelectorAll(".layer-item.drag-over").forEach((el) => el.classList.remove("drag-over"));
				item.classList.add("drag-over");
			}
		});

		item.addEventListener("dragleave", () => {
			item.classList.remove("drag-over");
		});

		item.addEventListener("drop", (e) => {
			e.preventDefault();
			if (dragSourceIndex === null) return;
			const targetIdx = Number.parseInt(item.dataset.index!, 10);
			if (targetIdx === dragSourceIndex) return;

			vscode.postMessage({
				type: "reorderLayers",
				fromIndex: dragSourceIndex,
				toIndex: targetIdx,
			});
			dragSourceIndex = null;
			dragOverIndex = null;
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
