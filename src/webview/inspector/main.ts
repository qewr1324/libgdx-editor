import type { GameObject } from "../../types/scene.js";

interface VsCodeApi {
	postMessage(msg: unknown): void;
	getState(): unknown;
	setState(state: unknown): void;
}
declare function acquireVsCodeApi(): VsCodeApi;

const vscode = acquireVsCodeApi();
const app = document.getElementById("app")!;

let currentObject: GameObject | null = null;
let currentObjectId: string | null = null;
let multiSelection: { count: number; ids: string[] } | null = null;

// ---------- Render ----------
function render(force = false): void {
	// چند انتخاب
	if (multiSelection) {
		app.innerHTML = `
			<div class="empty-state">
				<div class="empty-icon">▣▣</div>
				<div class="empty-text">${multiSelection.count} objects selected</div>
				<div class="empty-hint">Multi-edit coming soon<br/>Select a single object to edit its properties</div>
			</div>
		`;
		currentObject = null;
		currentObjectId = null;
		return;
	}

	if (!currentObject) {
		app.innerHTML = `
			<div class="empty-state">
				<div class="empty-icon">◻️</div>
				<div class="empty-text">No object selected</div>
				<div class="empty-hint">Click on an object in the viewport</div>
			</div>
		`;
		currentObjectId = null;
		return;
	}

	if (!force && currentObjectId === currentObject.id && app.querySelector(".inspector")) {
		updateFieldValues();
		return;
	}

	currentObjectId = currentObject.id;
	app.innerHTML = buildInspectorHtml(currentObject);
	attachEventListeners();
}

function buildInspectorHtml(obj: GameObject): string {
	const t = obj.transform;
	return `
		<div class="inspector">
			<div class="section header-section">
				<div class="header-top">
					<div class="object-type-badge type-${obj.type}">${obj.type}</div>
					<button class="btn-icon" id="btn-focus" title="Focus in viewport">🎯</button>
					<button class="btn-icon btn-danger" id="btn-delete" title="Delete object">🗑️</button>
				</div>
				<div class="object-id">${escapeHtml(obj.id)}</div>
			</div>

			<div class="section">
				<div class="section-title">Identity</div>
				<div class="field">
					<label>Name</label>
					<input type="text" data-field="name" value="${escapeAttr(obj.name)}" />
				</div>
				<div class="field">
					<label>Type</label>
					<select data-field="type">
						${["sprite", "shape", "text", "group"].map((tp) => `<option value="${tp}" ${obj.type === tp ? "selected" : ""}>${tp}</option>`).join("")}
					</select>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Transform</div>
				<div class="field-row">
					<div class="field">
						<label>X</label>
						<input type="number" data-field="transform.x" value="${t.x}" step="1" />
					</div>
					<div class="field">
						<label>Y</label>
						<input type="number" data-field="transform.y" value="${t.y}" step="1" />
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label>Width</label>
						<input type="number" data-field="transform.width" value="${t.width}" step="1" min="1" />
					</div>
					<div class="field">
						<label>Height</label>
						<input type="number" data-field="transform.height" value="${t.height}" step="1" min="1" />
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label>Rotation°</label>
						<input type="number" data-field="transform.rotation" value="${t.rotation}" step="1" />
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label>Scale X</label>
						<input type="number" data-field="transform.scaleX" value="${t.scaleX}" step="0.1" />
					</div>
					<div class="field">
						<label>Scale Y</label>
						<input type="number" data-field="transform.scaleY" value="${t.scaleY}" step="0.1" />
					</div>
				</div>
				<div class="field-row">
					<div class="field">
						<label>Origin X</label>
						<input type="number" data-field="transform.originX" value="${t.originX}" step="0.1" min="0" max="1" />
					</div>
					<div class="field">
						<label>Origin Y</label>
						<input type="number" data-field="transform.originY" value="${t.originY}" step="0.1" min="0" max="1" />
					</div>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Appearance</div>
				<div class="field">
					<label>Color</label>
					<div class="color-row">
						<input type="color" data-field="color" value="${obj.color || "#4a9eff"}" />
						<input type="text" data-field="color" value="${escapeAttr(obj.color || "#4a9eff")}" />
					</div>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Properties</div>
				<textarea class="properties-json" data-field="properties" rows="4">${escapeHtml(JSON.stringify(obj.properties || {}, null, 2))}</textarea>
			</div>
		</div>
	`;
}

function updateFieldValues(): void {
	if (!currentObject) return;
	const obj = currentObject;
	const t = obj.transform;

	setFieldValue("name", obj.name, "string");
	setFieldValue("type", obj.type, "select");

	setFieldValue("transform.x", t.x, "number");
	setFieldValue("transform.y", t.y, "number");
	setFieldValue("transform.width", t.width, "number");
	setFieldValue("transform.height", t.height, "number");
	setFieldValue("transform.rotation", t.rotation, "number");
	setFieldValue("transform.scaleX", t.scaleX, "number");
	setFieldValue("transform.scaleY", t.scaleY, "number");
	setFieldValue("transform.originX", t.originX, "number");
	setFieldValue("transform.originY", t.originY, "number");

	setFieldValue("color", obj.color || "#4a9eff", "color");
	setFieldValue("color", obj.color || "#4a9eff", "text");
	setFieldValue("properties", JSON.stringify(obj.properties || {}, null, 2), "textarea");

	const badge = app.querySelector(".object-type-badge");
	if (badge) {
		badge.className = `object-type-badge type-${obj.type}`;
		badge.textContent = obj.type;
	}
}

function setFieldValue(field: string, value: unknown, kind: "number" | "string" | "select" | "color" | "text" | "textarea"): void {
	const elements = app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-field="${field}"]`);

	for (const el of elements) {
		if (document.activeElement === el) continue;

		if (kind === "color" && el.type !== "color") continue;
		if (kind === "text" && el.type !== "text") continue;
		if (kind === "number" && el.type !== "number") continue;
		if (kind === "textarea" && el.tagName !== "TEXTAREA") continue;
		if (kind === "select" && el.tagName !== "SELECT") continue;
		if (kind === "string" && el.tagName !== "INPUT") continue;

		if (el.value === String(value)) continue;

		el.value = String(value);
	}
}

function attachEventListeners() {
	const deleteBtn = document.getElementById("btn-delete");
	deleteBtn?.addEventListener("click", () => {
		if (currentObject) {
			vscode.postMessage({ type: "deleteObject", objectId: currentObject.id });
		}
	});

	const focusBtn = document.getElementById("btn-focus");
	focusBtn?.addEventListener("click", () => {
		if (currentObject) {
			vscode.postMessage({ type: "focusObject", objectId: currentObject.id });
		}
	});

	const inputs = app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>("[data-field]");
	for (const input of inputs) {
		const field = input.dataset.field!;

		if (input instanceof HTMLInputElement && input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) {
					sendFieldUpdate(field, value);
				}
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLInputElement && input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) {
					textInput.value = input.value;
				}
				sendFieldUpdate(field, input.value);
			});
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				sendFieldUpdate(field, input.value);
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => {
				sendFieldUpdate(field, input.value);
			});
		} else if (input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				try {
					const parsed = JSON.parse(input.value);
					sendFieldUpdate(field, parsed);
					input.style.borderColor = "";
				} catch {
					input.style.borderColor = "#ff4a4a";
				}
			});
		}
	}
}

function sendFieldUpdate(field: string, value: unknown) {
	if (!currentObject) return;
	vscode.postMessage({
		type: "updateObjectField",
		objectId: currentObject.id,
		field,
		value,
	});
}

function escapeHtml(s: string): string {
	return s.replace(/[&<>"']/g, (c) => {
		return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!;
	});
}

function escapeAttr(s: string): string {
	return escapeHtml(s);
}

// ---------- Messages ----------
window.addEventListener("message", (event) => {
	const msg = event.data;
	switch (msg.type) {
		case "showObject":
			multiSelection = null;
			currentObject = msg.object;
			render(false);
			break;
		case "showMultiSelection":
			multiSelection = { count: msg.count, ids: msg.ids };
			render(true);
			break;
		case "clearSelection":
			multiSelection = null;
			currentObject = null;
			render(true);
			break;
	}
});

// ---------- Boot ----------
render(true);
vscode.postMessage({ type: "inspectorReady" });
