// src/webview/inspector/render/object-inspector.ts
import type { GameObject, Scene } from "../../../types/scene.js";
import { getLayerNameOfObject } from "../../../types/scene.js";
import type { Component } from "../../../types/components.js";
import { COMPONENT_LABELS, COMPONENT_ICONS } from "../../../types/components.js";
import { getAtlasProperties, normalizeAtlasProperties, type AtlasProperties } from "../../../features/texture-atlas/atlas-properties.js";
import { vscode, app } from "../vscode-api.js";
import { currentObject, currentScene, availableLayers, getAtlasEntry, hasAtlasCached } from "../state.js";
import { ICONS } from "../icons.js";
import { escapeAttr, escapeHtml } from "../utils.js";
import { sectionWrap, field, fieldRow, numberField, subHeader } from "./section-helpers.js";
import { attachSectionListeners } from "../events/section-listeners.js";
import { attachDragHandles } from "../events/drag-handles.js";
import { buildAtlasSection, emptyAtlasContext, type AtlasInspectorContext } from "./atlas-section.js";

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

	// 🆕 Atlas section
	const atlasProps = getAtlasProperties(obj);
	let atlasSection = "";
	if (atlasProps) {
		const ctx = buildAtlasContext(atlasProps);
		atlasSection = buildAtlasSection(atlasProps, obj, ctx);
	}

	const visualComponentsHtml = buildVisualComponentsSections(obj);

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
			${atlasSection}
			${visualComponentsHtml}
			${layerSection}
			${propertiesSection}
		</div>
	`;
}

// ============================================================
// Atlas Context
// ============================================================

function buildAtlasContext(props: AtlasProperties): AtlasInspectorContext {
	const entry = getAtlasEntry(props.texture);
	if (!entry) return emptyAtlasContext();
	return {
		regions: entry.regions,
		atlasPath: entry.atlasPath,
		loading: entry.loading,
		notFound: entry.notFound,
		textureWidth: entry.textureWidth,
		textureHeight: entry.textureHeight,
		textureDataUrl: entry.textureDataUrl,
	};
}

// ============================================================
// Visual Components — read-only display
// ============================================================

function buildVisualComponentsSections(obj: GameObject): string {
	const components = obj.components ?? [];
	const visual = components.filter((c) => isVisualComp(c));

	if (visual.length === 0) return "";

	return visual
		.map((comp) => {
			const icon = COMPONENT_ICONS[comp.type];
			const label = COMPONENT_LABELS[comp.type];
			const body = buildVisualComponentBody(comp);

			return `
			<div class="inspector-section" data-section-id="vc-${comp.id}">
				<div class="inspector-section-header">
					<span class="inspector-section-chevron">${ICONS.chevron}</span>
					<span class="inspector-section-label">${icon} ${escapeHtml(label)}</span>
					<button class="inspector-section-remove" data-remove-component="${comp.id}" title="Remove component">${ICONS.close}</button>
				</div>
				<div class="inspector-section-body">
					${body}
				</div>
			</div>
		`;
		})
		.join("");
}

function isVisualComp(c: Component): boolean {
	return c.type === "sprite" || c.type === "animation" || c.type === "shape" || c.type === "text";
}

function buildVisualComponentBody(comp: Component): string {
	switch (comp.type) {
		case "sprite":
			return `
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Texture</span>
					<span class="inspector-readonly-value">${escapeHtml(comp.texture || "(none)")}</span>
				</div>
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Tint</span>
					<span class="inspector-readonly-value">${escapeHtml(comp.tint ?? "#ffffff")}</span>
				</div>
			`;

		case "animation":
			return `
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Atlas</span>
					<span class="inspector-readonly-value">${escapeHtml(comp.atlasPath || "(none)")}</span>
				</div>
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Frames</span>
					<span class="inspector-readonly-value">${comp.frames.length} frames</span>
				</div>
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">FPS</span>
					<span class="inspector-readonly-value">${comp.fps}</span>
				</div>
			`;

		case "shape":
			return `
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Shape</span>
					<span class="inspector-readonly-value">${escapeHtml(comp.shape)}</span>
				</div>
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Color</span>
					<span class="inspector-readonly-value">
						<span class="inspector-color-swatch" style="background:${escapeAttr(comp.color)};"></span>
						${escapeHtml(comp.color)}
					</span>
				</div>
			`;

		case "text":
			return `
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Text</span>
					<span class="inspector-readonly-value">${escapeHtml(comp.text)}</span>
				</div>
				<div class="inspector-readonly-field">
					<span class="inspector-readonly-label">Font Size</span>
					<span class="inspector-readonly-value">${comp.fontSize}</span>
				</div>
			`;

		default:
			return "";
	}
}

// ============================================================
// Update field values
// ============================================================

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

	updateAtlasFieldValues(obj);

	const layerSelect = app.querySelector<HTMLSelectElement>("[data-layer-select]");
	if (layerSelect && scene) {
		const currentLayerId = obj.layerId ?? scene.layers.find((l) => getLayerNameOfObject(scene, obj) === l.name)?.id ?? "";
		if (currentLayerId && layerSelect.value !== currentLayerId) {
			layerSelect.value = currentLayerId;
		}
	}
}

function updateAtlasFieldValues(obj: GameObject): void {
	const props = getAtlasProperties(obj);
	if (!props) return;

	setSelectValue("mode", props.mode);
	setColorPair("tint", props.tint);

	if (props.mode === "single") {
		setSelectValue("region", props.region ?? "");
	}

	if (props.mode === "sequence") {
		const textarea = app.querySelector<HTMLTextAreaElement>('[data-atlas-field="frames"]');
		if (textarea && document.activeElement !== textarea) {
			const newVal = (props.frames ?? []).join("\n");
			if (textarea.value !== newVal) textarea.value = newVal;
		}
		setNumberValue("atlas.fps", props.fps ?? 8);
		const loopBox = app.querySelector<HTMLInputElement>('[data-atlas-field="loop"]');
		if (loopBox && document.activeElement !== loopBox) {
			loopBox.checked = !!props.loop;
		}
	}

	if (props.mode === "grid") {
		setNumberValue("atlas.gridCols", props.gridCols ?? 1);
		setNumberValue("atlas.gridRows", props.gridRows ?? 1);
		setNumberValue("atlas.cellOffsetX", props.cellOffsetX ?? 0);
		setNumberValue("atlas.cellOffsetY", props.cellOffsetY ?? 0);
		setNumberValue("atlas.startIndex", props.startIndex ?? 0);
	}
}

function setSelectValue(field: string, value: string): void {
	const el = app.querySelector<HTMLSelectElement>(`[data-atlas-field="${field}"]`);
	if (el && document.activeElement !== el && el.value !== value) {
		el.value = value;
	}
}

function setNumberValue(field: string, value: number): void {
	const el = app.querySelector<HTMLInputElement>(`[data-field="${field}"]`);
	if (el && document.activeElement !== el && el.value !== String(value)) {
		el.value = String(value);
	}
}

function setColorPair(field: string, value: string): void {
	const inputs = app.querySelectorAll<HTMLInputElement>(`[data-atlas-field="${field}"]`);
	for (const el of inputs) {
		if (document.activeElement === el) continue;
		if (el.value === value) continue;
		el.value = value;
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

// ============================================================
// Listeners
// ============================================================

export function attachObjectListeners(): void {
	attachSectionListeners();
	requestAtlasIfNeeded();

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

	attachAtlasListeners();

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

	const removeComponentBtns = app.querySelectorAll<HTMLButtonElement>("[data-remove-component]");
	for (const btn of removeComponentBtns) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
			if (!currentObject) return;
			vscode.postMessage({
				type: "removeComponent",
				objectId: currentObject.id,
				componentId: btn.dataset.removeComponent!,
			});
		});
	}

	attachDragHandles("object");
}

// ============================================================
// Atlas listeners
// ============================================================

function attachAtlasListeners(): void {
	const modeSelect = app.querySelector<HTMLSelectElement>('[data-atlas-field="mode"]');
	modeSelect?.addEventListener("change", () => {
		if (!currentObject) return;
		sendAtlasUpdate({ mode: modeSelect.value as "single" | "sequence" | "grid" });
	});

	const regionSelect = app.querySelector<HTMLSelectElement>('[data-atlas-field="region"]');
	regionSelect?.addEventListener("change", () => {
		if (!currentObject) return;
		sendAtlasUpdate({ region: regionSelect.value });
	});

	const framesTextarea = app.querySelector<HTMLTextAreaElement>('[data-atlas-field="frames"]');
	framesTextarea?.addEventListener("change", () => {
		if (!currentObject) return;
		const frames = framesTextarea.value
			.split(/\r?\n/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		sendAtlasUpdate({ frames });
	});

	const loopBox = app.querySelector<HTMLInputElement>('[data-atlas-field="loop"]');
	loopBox?.addEventListener("change", () => {
		if (!currentObject) return;
		sendAtlasUpdate({ loop: loopBox.checked });
	});

	const tintInputs = app.querySelectorAll<HTMLInputElement>('[data-atlas-field="tint"]');
	for (const input of tintInputs) {
		input.addEventListener("input", () => {
			const value = input.value;
			for (const other of tintInputs) {
				if (other !== input && document.activeElement !== other) {
					other.value = value;
				}
			}
			sendAtlasUpdate({ tint: value });
		});
	}

	const atlasNumberFields = app.querySelectorAll<HTMLInputElement>('[data-field^="atlas."]');
	for (const input of atlasNumberFields) {
		input.addEventListener("change", () => {
			if (!currentObject) return;
			const value = Number.parseFloat(input.value);
			if (Number.isNaN(value)) return;

			const fieldName = input.dataset.field!.slice("atlas.".length);
			switch (fieldName) {
				case "fps":
					sendAtlasUpdate({ fps: value });
					break;
				case "gridCols":
					sendAtlasUpdate({ gridCols: Math.max(1, Math.floor(value)) });
					break;
				case "gridRows":
					sendAtlasUpdate({ gridRows: Math.max(1, Math.floor(value)) });
					break;
				case "cellOffsetX":
					sendAtlasUpdate({ cellOffsetX: Math.floor(value) });
					break;
				case "cellOffsetY":
					sendAtlasUpdate({ cellOffsetY: Math.floor(value) });
					break;
				case "startIndex":
					sendAtlasUpdate({ startIndex: Math.max(0, Math.floor(value)) });
					break;
			}
		});
		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") input.blur();
		});
	}

	const removeBtn = app.querySelector<HTMLButtonElement>('[data-atlas-action="remove"]');
	removeBtn?.addEventListener("click", () => {
		if (!currentObject) return;
		vscode.postMessage({
			type: "updateAtlasProperties",
			objectId: currentObject.id,
			properties: null,
		});
	});

	const pickBtn = app.querySelector<HTMLButtonElement>('[data-atlas-action="pick-frames"]');
	pickBtn?.addEventListener("click", () => {
		if (!currentObject) return;
		const props = getAtlasProperties(currentObject);
		if (!props) return;
		const entry = getAtlasEntry(props.texture);
		if (!entry || entry.regions.length === 0) return;

		const input = window.prompt("Frames (comma-separated):", entry.regions.map((r) => r.name).join(", "));
		if (input === null) return;
		const frames = input
			.split(",")
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
		sendAtlasUpdate({ frames });
	});
}

function sendAtlasUpdate(partial: Partial<AtlasProperties>): void {
	if (!currentObject) return;

	const existing = getAtlasProperties(currentObject) ?? normalizeAtlasProperties({});
	const merged = normalizeAtlasProperties({ ...existing, ...partial });

	if (partial.mode && partial.mode !== existing.mode) {
		if (merged.mode !== "single") merged.region = undefined;
		if (merged.mode !== "sequence") {
			merged.frames = undefined;
			merged.fps = undefined;
			merged.loop = undefined;
		}
		if (merged.mode !== "grid") {
			merged.gridCols = undefined;
			merged.gridRows = undefined;
			merged.cellOffsetX = undefined;
			merged.cellOffsetY = undefined;
			merged.startIndex = undefined;
		}
	}

	vscode.postMessage({
		type: "updateAtlasProperties",
		objectId: currentObject.id,
		properties: merged,
	});
}

function requestAtlasIfNeeded(): void {
	if (!currentObject) return;
	const props = getAtlasProperties(currentObject);
	if (!props || !props.texture) return;

	// درخواست atlas regions (اگه نداریم)
	if (!hasAtlasCached(props.texture)) {
		vscode.postMessage({
			type: "requestAtlasRegions",
			texturePath: props.texture,
		});
	}
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
