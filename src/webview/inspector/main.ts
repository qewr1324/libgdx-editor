import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import { THEMES, THEME_ORDER } from "../viewport/theme/themes.js";
import { applyTheme } from "../viewport/theme/theme-manager.js";

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
let currentScene: Scene | null = null;
let currentConfig: LibGdxEditorConfigMessage | null = null;
let multiSelection: { count: number; ids: string[] } | null = null;
let sceneMode = false;
let lastAppliedTheme: string | null = null;

const collapsedSections = new Set<string>();

// ============================================================
// Theme
// ============================================================

function applyEffectiveTheme(): void {
	const themeName = currentScene?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	lastAppliedTheme = themeName;
	applyTheme(themeName, false);
}

// ============================================================
// Icons
// ============================================================

const ICONS = {
	sprite: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="1" opacity="0.9"/></svg>`,
	shape: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><circle cx="8" cy="8" r="6"/></svg>`,
	text: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3 3h10v2H9v8H7V5H3z"/></svg>`,
	group: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="5" height="5"/><rect x="9" y="2" width="5" height="5"/><rect x="2" y="9" width="5" height="5"/><rect x="9" y="9" width="5" height="5"/></svg>`,
	scene: `<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 12l4-8 3 5 2-3 3 6z"/></svg>`,
	chevron: `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M4 6l4 4 4-4z"/></svg>`,
	chevronRight: `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M6 4l4 4-4 4z"/></svg>`,
	reset: `<svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor"><path d="M1 8a7 7 0 0112-5l1-1v4h-4l1-1A5 5 0 103 8H1z"/></svg>`,
	focus: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 100 10A5 5 0 008 3zm0 3a2 2 0 110 4 2 2 0 010-4z"/><path d="M8 0v3M8 13v3M0 8h3M13 8h3" stroke="currentColor" stroke-width="1.5"/></svg>`,
	trash: `<svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M6 2h4l.5 1H14v1H2V3h3.5zM4 5h8l-.7 9H4.7z"/></svg>`,
	drag: `<svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor"><path d="M5 3l-2 2 2 2V3zm0 4l-2 2 2 2V7zm6-4l2 2-2 2V3zm0 4l2 2-2 2V7z"/></svg>`,
};

// ============================================================
// Render
// ============================================================

function render(force = false): void {
	applyEffectiveTheme();

	if (sceneMode && currentScene) {
		if (!force && app.querySelector(".inspector-scene")) {
			updateSceneFieldValues();
			return;
		}
		const active = document.activeElement;
		if (active instanceof HTMLInputElement && (active.type === "color" || active.type === "number" || active.type === "text") && app.contains(active)) {
			return;
		}
		if (active instanceof HTMLSelectElement && app.contains(active)) {
			return;
		}
		app.innerHTML = buildSceneSettingsHtml(currentScene);
		attachSceneListeners();
		return;
	}

	if (multiSelection) {
		app.innerHTML = `
			<div class="inspector-empty">
				<div class="inspector-empty-icon">▣▣</div>
				<div class="inspector-empty-title">${multiSelection.count} objects selected</div>
				<div class="inspector-empty-hint">Select a single object to edit its properties</div>
			</div>
		`;
		currentObject = null;
		currentObjectId = null;
		return;
	}

	if (!currentObject) {
		app.innerHTML = `
			<div class="inspector-empty">
				<div class="inspector-empty-icon">◻️</div>
				<div class="inspector-empty-title">No object selected</div>
				<div class="inspector-empty-hint">Click on an object in the viewport<br/>Right-click on the viewport to edit scene settings</div>
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

// ============================================================
// Section helpers
// ============================================================

function sectionHeader(id: string, label: string, opts: { reset?: boolean } = {}): string {
	const collapsed = collapsedSections.has(id);
	const chevron = collapsed ? ICONS.chevronRight : ICONS.chevron;
	const resetBtn = opts.reset ? `<button class="inspector-section-reset" data-section-reset="${id}" title="Reset">${ICONS.reset}</button>` : "";

	return `
		<div class="inspector-section-header" data-section-toggle="${id}">
			<span class="inspector-section-chevron">${chevron}</span>
			<span class="inspector-section-label">${escapeHtml(label)}</span>
			${resetBtn}
		</div>
	`;
}

function sectionWrap(id: string, label: string, content: string, opts: { reset?: boolean } = {}): string {
	const collapsed = collapsedSections.has(id);
	return `
		<div class="inspector-section ${collapsed ? "collapsed" : ""}" data-section-id="${id}">
			${sectionHeader(id, label, opts)}
			<div class="inspector-section-body">${content}</div>
		</div>
	`;
}

function field(label: string, inputHtml: string): string {
	return `
		<div class="inspector-field">
			<label class="inspector-field-label">${escapeHtml(label)}</label>
			<div class="inspector-field-input">${inputHtml}</div>
		</div>
	`;
}

function numberField(label: string, fieldKey: string, value: number, opts: { step?: number; min?: number; max?: number; sensitivity?: number } = {}): string {
	const sensitivity = opts.sensitivity ?? (opts.step && opts.step < 1 ? 0.01 : 1);
	const minAttr = opts.min !== undefined ? `min="${opts.min}"` : "";
	const maxAttr = opts.max !== undefined ? `max="${opts.max}"` : "";
	const stepAttr = opts.step !== undefined ? `step="${opts.step}"` : "1";

	return `
		<div class="inspector-field">
			<label class="inspector-field-label">${escapeHtml(label)}</label>
			<div class="inspector-field-input">
				<div class="inspector-number-wrap">
					<div class="inspector-drag-handle" data-drag-field="${fieldKey}" data-drag-sensitivity="${sensitivity}" title="Drag to change">
						${ICONS.drag}
					</div>
					<input type="number" data-field="${fieldKey}" value="${value}" step="${stepAttr}" ${minAttr} ${maxAttr} />
				</div>
			</div>
		</div>
	`;
}

function fieldRow(field1: string, field2: string): string {
	return `<div class="inspector-field-row">${field1}${field2}</div>`;
}

function subHeader(label: string): string {
	return `<div class="inspector-subheader">${escapeHtml(label)}</div>`;
}

// ============================================================
// Scene Settings
// ============================================================

function buildSceneSettingsHtml(scene: Scene): string {
	const isOverride = scene.themeOverride !== null && scene.themeOverride !== undefined;

	const themeSection = sectionWrap(
		"scene-theme",
		"Theme",
		`
			<div class="inspector-field wide">
				<label class="inspector-checkbox-row">
					<input type="checkbox" data-special="theme-override-enabled" ${isOverride ? "checked" : ""} />
					<span>Override theme for this scene</span>
				</label>
			</div>
			${field(
				"UI Theme",
				`<select data-config-field="defaultTheme" ${isOverride ? "disabled" : ""}>
					${THEME_ORDER.map((key) => {
						const theme = THEMES[key];
						const selected = (currentConfig?.defaultTheme ?? "win98") === key ? "selected" : "";
						return `<option value="${key}" ${selected}>${theme.label}</option>`;
					}).join("")}
				</select>`,
			)}
			${
				isOverride
					? field(
							"Override",
							`<select data-scene-field="themeOverride">
								${THEME_ORDER.map((key) => {
									const theme = THEMES[key];
									const selected = (scene.themeOverride ?? "win98") === key ? "selected" : "";
									return `<option value="${key}" ${selected}>${theme.label}</option>`;
								}).join("")}
							</select>`,
						)
					: ""
			}
		`,
	);

	const worldSection = sectionWrap("scene-world", "World Size", fieldRow(numberField("Width", "worldSize.width", scene.worldSize.width, { step: 1, min: 1 }), numberField("Height", "worldSize.height", scene.worldSize.height, { step: 1, min: 1 })));

	const appearanceSection = sectionWrap(
		"scene-appearance",
		"Appearance",
		`
			<div class="inspector-field wide">
				<label class="inspector-field-label">Background</label>
				<div class="inspector-color-row">
					<input type="color" data-scene-field="backgroundColor" value="${scene.backgroundColor}" />
					<input type="text" data-scene-field="backgroundColor" value="${escapeAttr(scene.backgroundColor)}" />
				</div>
			</div>
			${numberField("Grid Size", "gridSize", scene.gridSize, { step: 1, min: 1 })}
		`,
	);

	const behaviorSection = sectionWrap(
		"scene-behavior",
		"Behavior",
		`
			<div class="inspector-field wide">
				<label class="inspector-checkbox-row">
					<input type="checkbox" data-scene-field="snapToGrid" ${scene.snapToGrid ? "checked" : ""} />
					<span>Snap to Grid</span>
				</label>
			</div>
		`,
	);

	return `
		<div class="inspector inspector-scene">
			<div class="inspector-header scene">
				<div class="inspector-header-icon">${ICONS.scene}</div>
				<div class="inspector-header-title">${escapeHtml(scene.name)}</div>
				<button class="inspector-header-btn" id="btn-close-scene" title="Close">✖</button>
			</div>
			${themeSection}
			${worldSection}
			${appearanceSection}
			${behaviorSection}
		</div>
	`;
}

function updateSceneFieldValues(): void {
	if (!currentScene) return;
	setSceneFieldValue("worldSize.width", currentScene.worldSize.width, "number");
	setSceneFieldValue("worldSize.height", currentScene.worldSize.height, "number");
	setSceneFieldValue("backgroundColor", currentScene.backgroundColor, "color");
	setSceneFieldValue("backgroundColor", currentScene.backgroundColor, "text");
	setSceneFieldValue("gridSize", currentScene.gridSize, "number");
	setSceneFieldValue("snapToGrid", currentScene.snapToGrid, "checkbox");
}

function setSceneFieldValue(field: string, value: unknown, kind: "number" | "text" | "color" | "checkbox" | "select"): void {
	const elements = app.querySelectorAll<HTMLInputElement | HTMLSelectElement>(`[data-scene-field="${field}"]`);
	for (const el of elements) {
		if (document.activeElement === el) continue;
		const colorRow = el.closest(".color-row, .inspector-color-row");
		if (colorRow && colorRow.contains(document.activeElement)) continue;

		if (kind === "color" && el.type !== "color") continue;
		if (kind === "text" && el.type !== "text") continue;
		if (kind === "number" && el.type !== "number") continue;
		if (kind === "checkbox" && el.type !== "checkbox") continue;
		if (kind === "select" && el.tagName !== "SELECT") continue;

		if (el instanceof HTMLSelectElement) {
			if (el.value === String(value)) continue;
			el.value = String(value);
		} else if (el instanceof HTMLInputElement && el.type === "checkbox") {
			if (el.checked === value) continue;
			el.checked = value as boolean;
		} else if (el instanceof HTMLInputElement) {
			if (el.value === String(value)) continue;
			el.value = String(value);
		}
	}
}

function attachSceneListeners(): void {
	attachSectionListeners();

	document.getElementById("btn-close-scene")?.addEventListener("click", () => {
		sceneMode = false;
		render(true);
	});

	const overrideCheckbox = app.querySelector<HTMLInputElement>('[data-special="theme-override-enabled"]');
	overrideCheckbox?.addEventListener("change", () => {
		const checked = overrideCheckbox.checked;
		const value = checked ? (currentConfig?.defaultTheme ?? "win98") : null;
		vscode.postMessage({ type: "updateSceneField", field: "themeOverride", value, historyLabel: "toggle theme override" });
	});

	const configInputs = app.querySelectorAll<HTMLSelectElement>("[data-config-field]");
	for (const input of configInputs) {
		const fieldName = input.dataset.configField!;
		input.addEventListener("change", () => {
			vscode.postMessage({ type: "updateConfig", key: fieldName, value: input.value });
		});
	}

	const inputs = app.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-scene-field]");
	for (const input of inputs) {
		const fieldName = input.dataset.sceneField!;

		if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field: fieldName, value: input.value, historyLabel: `scene: ${fieldName}` });
			});
		} else if (input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) {
					vscode.postMessage({ type: "updateSceneField", field: fieldName, value, historyLabel: `scene: ${fieldName}` });
				}
			});
		} else if (input.type === "checkbox") {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field: fieldName, value: input.checked, historyLabel: `scene: ${fieldName}` });
			});
		} else if (input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) {
					textInput.value = input.value;
				}
				vscode.postMessage({ type: "updateSceneField", field: fieldName, value: input.value, historyLabel: `scene: ${fieldName}` });
			});
		} else {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field: fieldName, value: input.value, historyLabel: `scene: ${fieldName}` });
			});
		}
	}

	attachDragHandles("scene");
}

// ============================================================
// Object Inspector
// ============================================================

function buildInspectorHtml(obj: GameObject): string {
	const t = obj.transform;
	const typeIcon = ICONS[obj.type as keyof typeof ICONS] ?? ICONS.sprite;

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

	const appearanceSection = sectionWrap(
		"appearance",
		"Appearance",
		`
			<div class="inspector-field wide">
				<label class="inspector-field-label">Color</label>
				<div class="inspector-color-row">
					<input type="color" data-field="color" value="${obj.color || "#4a9eff"}" />
					<input type="text" data-field="color" value="${escapeAttr(obj.color || "#4a9eff")}" />
				</div>
			</div>
			${
				obj.texture
					? `<div class="inspector-field wide">
						<label class="inspector-field-label">Texture</label>
						<div class="inspector-texture-row">
							<span class="inspector-texture-icon">🖼️</span>
							<span class="inspector-texture-path">${escapeHtml(obj.texture)}</span>
						</div>
					</div>`
					: ""
			}
		`,
		{ reset: true },
	);

	const layerSection = sectionWrap(
		"layer",
		"Layer",
		`
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

	const identitySection = sectionWrap(
		"identity",
		"Identity",
		`
			${field("Name", `<input type="text" data-field="name" value="${escapeAttr(obj.name)}" />`)}
			${field(
				"Type",
				`<select data-field="type">
					${["sprite", "shape", "text", "group"].map((tp) => `<option value="${tp}" ${obj.type === tp ? "selected" : ""}>${tp}</option>`).join("")}
				</select>`,
			)}
		`,
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
			${transformSection}
			${appearanceSection}
			${layerSection}
			${identitySection}
			${propertiesSection}
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
	setFieldValue("zIndex", obj.zIndex ?? 0, "number");
	setFieldValue("color", obj.color || "#4a9eff", "color");
	setFieldValue("color", obj.color || "#4a9eff", "text");
	setFieldValue("properties", JSON.stringify(obj.properties || {}, null, 2), "textarea");
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

function attachEventListeners(): void {
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

// ============================================================
// Drag Handles
// ============================================================

function attachDragHandles(mode: "object" | "scene"): void {
	const dragHandles = app.querySelectorAll<HTMLElement>("[data-drag-field]");
	for (const handle of dragHandles) {
		const fieldKey = handle.dataset.dragField!;
		const sensitivity = parseFloat(handle.dataset.dragSensitivity ?? "1");

		let isDragging = false;
		let startX = 0;
		let startValue = 0;

		handle.addEventListener("pointerdown", (e) => {
			e.preventDefault();
			e.stopPropagation();
			isDragging = true;
			startX = e.clientX;

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			startValue = parseFloat(input?.value ?? "0");
			if (Number.isNaN(startValue)) startValue = 0;

			handle.setPointerCapture(e.pointerId);
			document.body.style.cursor = "ew-resize";
		});

		handle.addEventListener("pointermove", (e) => {
			if (!isDragging) return;
			const dx = e.clientX - startX;
			const deltaValue = dx * sensitivity * 0.5;
			const newValue = startValue + deltaValue;

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			if (input) {
				const step = parseFloat(input.step || "1");
				const rounded = step < 1 ? Math.round(newValue * 100) / 100 : Math.round(newValue);
				input.value = String(rounded);
			}
		});

		const finish = (e: PointerEvent) => {
			if (!isDragging) return;
			isDragging = false;
			try {
				handle.releasePointerCapture(e.pointerId);
			} catch {
				// ignore
			}
			document.body.style.cursor = "";

			const input = handle.parentElement?.querySelector<HTMLInputElement>("input");
			if (input) {
				const value = parseFloat(input.value);
				if (!Number.isNaN(value)) {
					if (mode === "object" && currentObject) {
						if (fieldKey === "zIndex") {
							vscode.postMessage({ type: "setObjectZIndex", objectId: currentObject.id, zIndex: Math.round(value) });
						} else {
							sendFieldUpdate(fieldKey, value);
						}
					} else if (mode === "scene") {
						vscode.postMessage({ type: "updateSceneField", field: fieldKey, value, historyLabel: `scene: ${fieldKey}` });
					}
				}
			}
		};

		handle.addEventListener("pointerup", finish);
		handle.addEventListener("pointercancel", finish);
	}
}

// ============================================================
// Section toggle
// ============================================================

function attachSectionListeners(): void {
	const headers = app.querySelectorAll<HTMLDivElement>("[data-section-toggle]");
	for (const header of headers) {
		header.addEventListener("click", (e) => {
			if ((e.target as HTMLElement).closest("[data-section-reset]")) return;
			const id = header.dataset.sectionToggle!;
			if (collapsedSections.has(id)) {
				collapsedSections.delete(id);
			} else {
				collapsedSections.add(id);
			}
			if (currentObject && !sceneMode) {
				app.innerHTML = buildInspectorHtml(currentObject);
				attachEventListeners();
			} else if (sceneMode && currentScene) {
				app.innerHTML = buildSceneSettingsHtml(currentScene);
				attachSceneListeners();
			}
		});
	}

	const resetButtons = app.querySelectorAll<HTMLButtonElement>("[data-section-reset]");
	for (const btn of resetButtons) {
		btn.addEventListener("click", (e) => {
			e.stopPropagation();
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
	switch (msg.type) {
		case "showObject":
			multiSelection = null;
			sceneMode = false;
			currentObject = msg.object;
			render(false);
			break;

		case "showMultiSelection":
			sceneMode = false;
			multiSelection = { count: msg.count, ids: msg.ids };
			render(true);
			break;

		case "showScene":
			currentScene = msg.scene;
			applyEffectiveTheme();
			if (sceneMode) {
				updateSceneFieldValues();
			}
			break;

		case "showSceneSettings":
			currentScene = msg.scene;
			sceneMode = true;
			currentObject = null;
			multiSelection = null;
			render(true);
			break;

		case "clearSelection":
			multiSelection = null;
			currentObject = null;
			sceneMode = false;
			render(true);
			break;

		case "configLoaded":
		case "configUpdated": {
			currentConfig = msg.config;
			const previousTheme = lastAppliedTheme;
			applyEffectiveTheme();
			const themeChanged = previousTheme !== lastAppliedTheme;
			if (sceneMode && themeChanged) {
				render(true);
			}
			break;
		}
	}
});

render(true);
vscode.postMessage({ type: "inspectorReady" });
vscode.postMessage({ type: "requestConfig" });
