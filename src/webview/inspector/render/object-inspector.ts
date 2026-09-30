// src/webview/inspector/render/object-inspector.ts
import type { GameObject, Scene } from "../../../types/scene.js";
import { getLayerNameOfObject } from "../../../types/scene.js";
import { vscode, app } from "../vscode-api.js";
import { currentObject, currentScene, availableLayers, setCurrentObject } from "../state.js";
import { ICONS } from "../icons.js";
import { escapeAttr, escapeHtml } from "../utils.js";
import { sectionWrap, field, fieldRow, numberField, subHeader } from "./section-helpers.js";
import { attachSectionListeners } from "../events/section-listeners.js";
import { attachDragHandles } from "../events/drag-handles.js";

export function buildInspectorHtml(obj: GameObject): string {
	const t = obj.transform;
	const typeIcon = ICONS[obj.type as keyof typeof ICONS] ?? ICONS.gameobject;

	const transformSection = sectionWrap(
		"transform",
		"Transform",
		`
			${subHeader("Position")}
			${fieldRow(numberField("X", "transform.x", t.x, { step: 1 }), numberField("Y", "transform.y", t.y, { step: 1 }))}
			${subHeader("Rotation")}
			${numberField("Angle", "transform.rotation", t.rotation, { step: 1 })}
			${subHeader("Scale")}
			${fieldRow(numberField("X", "transform.scaleX", t.scaleX, { step: 0.1, sensitivity: 0.01 }), numberField("Y", "transform.scaleY", t.scaleY, { step: 0.1, sensitivity: 0.01 }))}
			${subHeader("Size")}
			${fieldRow(numberField("W", "transform.width", t.width, { step: 1, min: 1 }), numberField("H", "transform.height", t.height, { step: 1, min: 1 }))}
			${subHeader("Origin")}
			${fieldRow(numberField("X", "transform.originX", t.originX, { step: 0.1, min: 0, max: 1, sensitivity: 0.01 }), numberField("Y", "transform.originY", t.originY, { step: 0.1, min: 0, max: 1, sensitivity: 0.01 }))}
		`,
		{ reset: true },
	);

	const identitySection = sectionWrap(
		"identity",
		"Identity",
		`
			${field("Name", `<input type="text" data-field="name" value="${escapeAttr(obj.name)}" />`)}
		`,
	);

	const currentLayerId = obj.layerId ?? currentScene?.layers.find((l) => getLayerNameOfObject(currentScene!, obj) === l.name)?.id ?? "";

	const layerOptions = availableLayers
		.map((l) => {
			const selected = l.id === currentLayerId ? "selected" : "";
			return `<option value="${escapeAttr(l.id)}" ${selected}>${escapeHtml(l.name)}</option>`;
		})
		.join("");

	const layerSection = sectionWrap(
		"layer",
		"Layer",
		`
			<div class="inspector-field">
				<label class="inspector-field-label">Layer</label>
				<div class="inspector-field-input">
					<select data-layer-select>
						${layerOptions}
					</select>
				</div>
			</div>
			${numberField("Z-Index", "zIndex", obj.zIndex ?? 0, { step: 1 })}
			<div class="inspector-layer-buttons">
				<button class="inspector-layer-btn" data-layer-action="front" title="Bring to Front">⏫ Front</button>
				<button class="inspector-layer-btn" data-layer-action="forward" title="Bring Forward">⬆️ Fwd</button>
				<button class="inspector-layer-btn" data-layer-action="backward" title="Send Backward">⬇️ Bwd</button>
				<button class="inspector-layer-btn" data-layer-action="back" title="Send to Back">⏬ Back</button>
			</div>
		`,
		{ reset: true },
	);

	const propertiesSection = sectionWrap(
		"properties",
		"Properties",
		`
			<textarea class="inspector-properties-json" data-field="properties" rows="4">${escapeHtml(JSON.stringify(obj.properties || {}, null, 2))}</textarea>
		`,
	);

	return `
		<div class="inspector">
			<div class="inspector-header type-${obj.type}">
				<div class="inspector-header-icon">${typeIcon}</div>
				<input class="inspector-header-title-input" data-field="name" value="${escapeAttr(obj.name)}" />
				<button class="inspector-header-btn" id="btn-focus" title="Focus in viewport">${ICONS.focus}</button>
				<button class="inspector-header-btn danger" id="btn-delete" title="Delete">${ICONS.trash}</button>
			</div>
			<div class="inspector-id">${escapeHtml(obj.id)}</div>
			${identitySection}
			${transformSection}
			${layerSection}
			${propertiesSection}
		</div>
	`;
}

export function updateFieldValues(obj: GameObject, scene: Scene | null): void {
	const t = obj.transform;

	setFieldValue("name", obj.name, "string");
	setFieldValue("transform.x", t.x, "number");
	setFieldValue("transform.y", t.y, "number");
	setFieldValue("transform.width", t.width, "number");
	setFieldValue("transform.height", t.height, "number");
	setFieldValue("transform.rotation", t.rotation, "number");
	setFieldValue("transform.scaleX", t.scaleX, "number");
	setFieldValue("transform.scaleY", t.scaleY, "number");
	setFieldValue("transform.originX", t.originX, "number");
	setFieldValue("transform.originY", t.originY, "number");
	setFieldValue("zIndex", obj.zIndex ?? 0, "number");
	setFieldValue("properties", JSON.stringify(obj.properties || {}, null, 2), "textarea");

	const layerSelect = app.querySelector<HTMLSelectElement>("[data-layer-select]");
	if (layerSelect && scene) {
		const currentLayerId = obj.layerId ?? scene.layers.find((l) => getLayerNameOfObject(scene, obj) === l.name)?.id ?? "";
		if (currentLayerId && layerSelect.value !== currentLayerId) {
			layerSelect.value = currentLayerId;
		}
	}
}

function setFieldValue(field: string, value: unknown, kind: "number" | "string" | "select" | "color" | "text" | "textarea"): void {
	const elements = app.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(`[data-field="${field}"]`);

	for (const el of elements) {
		if (document.activeElement === el) continue;
		const colorRow = el.closest(".color-row, .inspector-color-row");
		if (colorRow && colorRow.contains(document.activeElement)) continue;

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

export function attachObjectListeners(): void {
	attachSectionListeners();

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
		const fieldName = input.dataset.field!;

		if (fieldName === "zIndex" && input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				const value = Number.parseInt(input.value, 10);
				if (!Number.isNaN(value) && currentObject) {
					vscode.postMessage({ type: "setObjectZIndex", objectId: currentObject.id, zIndex: value });
				}
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLInputElement && input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) {
					sendFieldUpdate(fieldName, value);
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
				sendFieldUpdate(fieldName, input.value);
			});
		} else if (input instanceof HTMLInputElement) {
			input.addEventListener("change", () => {
				sendFieldUpdate(fieldName, input.value);
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => {
				sendFieldUpdate(fieldName, input.value);
			});
		} else if (input instanceof HTMLTextAreaElement) {
			input.addEventListener("change", () => {
				try {
					const parsed = JSON.parse(input.value);
					sendFieldUpdate(fieldName, parsed);
					input.style.borderColor = "";
				} catch {
					input.style.borderColor = "#ff4a4a";
				}
			});
		}
	}

	const layerSelect = app.querySelector<HTMLSelectElement>("[data-layer-select]");
	layerSelect?.addEventListener("change", () => {
		if (!currentObject) return;
		vscode.postMessage({
			type: "moveObjectToLayer",
			objectId: currentObject.id,
			layerId: layerSelect.value,
		});
	});

	const layerButtons = app.querySelectorAll<HTMLButtonElement>("[data-layer-action]");
	for (const btn of layerButtons) {
		btn.addEventListener("click", () => {
			if (!currentObject) return;
			const action = btn.dataset.layerAction;
			switch (action) {
				case "front":
					vscode.postMessage({ type: "bringToFront", objectId: currentObject.id });
					break;
				case "forward":
					vscode.postMessage({ type: "bringForward", objectId: currentObject.id });
					break;
				case "backward":
					vscode.postMessage({ type: "sendBackward", objectId: currentObject.id });
					break;
				case "back":
					vscode.postMessage({ type: "sendToBack", objectId: currentObject.id });
					break;
			}
		});
	}

	attachDragHandles("object");
}

function sendFieldUpdate(field: string, value: unknown): void {
	if (!currentObject) return;
	vscode.postMessage({
		type: "updateObjectField",
		objectId: currentObject.id,
		field,
		value,
	});
}
