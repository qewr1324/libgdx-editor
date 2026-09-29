import { objects, selectedObjectId, setSelectedObjectId } from "../state.js";
import type { ObjectInfo } from "../protocol.js";

export interface ObjectPickerCallbacks {
	onObjectSelected(objectId: string): void;
	onAddTrackForObject(objectId: string): void;
}

let callbacks: ObjectPickerCallbacks | null = null;
let container: HTMLElement | null = null;

export function setupObjectPicker(el: HTMLElement, cb: ObjectPickerCallbacks): void {
	container = el;
	callbacks = cb;
	render();
}

export function rerenderObjectPicker(): void {
	render();
}

function render(): void {
	if (!container) return;

	if (objects.length === 0) {
		container.innerHTML = `<div class="kf-empty">No objects in scene</div>`;
		return;
	}

	container.innerHTML = `
		<div class="obj-picker">
			<div class="obj-picker-hint">Select an object to animate</div>
			${objects
				.map(
					(o) => `
				<div class="obj-picker-item ${o.id === selectedObjectId ? "selected" : ""}" data-object-id="${escapeAttr(o.id)}">
					<span class="obj-picker-icon">${getIcon(o.type)}</span>
					<span class="obj-picker-name">${escapeHtml(o.name)}</span>
					<span class="obj-picker-type">${escapeHtml(o.type)}</span>
				</div>
			`,
				)
				.join("")}
		</div>
	`;

	attachListeners();
}

function attachListeners(): void {
	if (!container || !callbacks) return;

	const items = container.querySelectorAll<HTMLElement>("[data-object-id]");
	for (const item of items) {
		const id = item.dataset.objectId!;
		item.addEventListener("click", () => {
			setSelectedObjectId(id);
			callbacks!.onObjectSelected(id);
			rerenderObjectPicker();
		});

		item.addEventListener("dblclick", () => {
			setSelectedObjectId(id);
			callbacks!.onAddTrackForObject(id);
			rerenderObjectPicker();
		});
	}
}

function getIcon(type: string): string {
	switch (type) {
		case "sprite":
			return "🖼️";
		case "shape":
			return "⬛";
		case "text":
			return "🔤";
		case "group":
			return "📁";
		default:
			return "◻️";
	}
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}
