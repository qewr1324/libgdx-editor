// src/webview/layers/main.ts
import { injectStyles } from "./styles.js";
injectStyles();

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

// ============================================================
// Icons (SVG با currentColor — خودکار با تم VSCode هماهنگ می‌شن)
// ============================================================

const ICONS = {
	eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
	eyeOff: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`,
	lock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`,
	unlock: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>`,
	plus: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
	trash: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`,
	chevronUp: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 15 12 9 18 15"/></svg>`,
	chevronDown: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`,
	grip: `<svg width="10" height="14" viewBox="0 0 10 16" fill="currentColor"><circle cx="2" cy="4" r="1"/><circle cx="8" cy="4" r="1"/><circle cx="2" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="2" cy="12" r="1"/><circle cx="8" cy="12" r="1"/></svg>`,
};

// ============================================================
// Render
// ============================================================

function render(): void {
	const reversed = [...layers].reverse();

	if (layers.length === 0) {
		app.innerHTML = `
			<div class="layers-empty">
				<div class="layers-empty-icon">${ICONS.grip}</div>
				<div class="layers-empty-title">No layers</div>
				<button class="layers-empty-btn" id="btn-add-layer-empty">
					${ICONS.plus}
					<span>New Layer</span>
				</button>
			</div>
		`;
		document.getElementById("btn-add-layer-empty")?.addEventListener("click", () => {
			vscode.postMessage({ type: "addLayer" });
		});
		return;
	}

	app.innerHTML = `
		<div class="layers-panel">
			<div class="layers-toolbar">
				<button class="layers-toolbar-btn" id="btn-add-layer" title="New Layer">
					${ICONS.plus}
				</button>
				<button class="layers-toolbar-btn" id="btn-delete-layer" title="Delete Selected Layer" ${selectedLayer ? "" : "disabled"}>
					${ICONS.trash}
				</button>
				<span class="layers-count">${layers.length} layer${layers.length === 1 ? "" : "s"}</span>
			</div>
			<div id="layers-list" class="layers-list">
				${reversed
					.map((layer, revIdx) => {
						const realIdx = layers.length - 1 - revIdx;
						const isSelected = layer.name === selectedLayer;
						const isDragging = dragSourceIndex === realIdx;
						const isDragOver = dragOverIndex === realIdx && dragSourceIndex !== realIdx;
						const objCount = layer.objects.length;

						const classes = ["layer-item", isSelected ? "selected" : "", !layer.visible ? "is-hidden" : "", layer.locked ? "is-locked" : "", isDragging ? "dragging" : "", isDragOver ? "drag-over" : ""].filter(Boolean).join(" ");

						return `
						<div
							class="${classes}"
							data-name="${escapeAttr(layer.name)}"
							data-index="${realIdx}"
							draggable="true"
						>
							<span class="layer-grip" title="Drag to reorder">${ICONS.grip}</span>
							<button class="layer-icon-btn" data-action="toggle-visibility" title="${layer.visible ? "Hide layer" : "Show layer"}">
								${layer.visible ? ICONS.eye : ICONS.eyeOff}
							</button>
							<button class="layer-icon-btn" data-action="toggle-lock" title="${layer.locked ? "Unlock layer" : "Lock layer"}">
								${layer.locked ? ICONS.lock : ICONS.unlock}
							</button>
							<div class="layer-name" data-action="rename" title="${escapeAttr(layer.name)}">
								${editingName === layer.name ? `<input type="text" value="${escapeAttr(layer.name)}" data-edit-input />` : `<span class="layer-name-text">${escapeHtml(layer.name)}</span><span class="layer-obj-count">${objCount}</span>`}
							</div>
							<div class="layer-actions">
								<button class="layer-icon-btn small" data-action="move-up" title="Move Up">${ICONS.chevronUp}</button>
								<button class="layer-icon-btn small" data-action="move-down" title="Move Down">${ICONS.chevronDown}</button>
							</div>
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

// ============================================================
// Event Listeners
// ============================================================

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

// ============================================================
// Utils
// ============================================================

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
	});
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}

// ============================================================
// Messages
// ============================================================

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
