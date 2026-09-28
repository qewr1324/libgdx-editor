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

function applyEffectiveTheme(): void {
	const themeName = currentScene?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	if (themeName === lastAppliedTheme) return;
	lastAppliedTheme = themeName;
	applyTheme(themeName);
}

function render(force = false): void {
	applyEffectiveTheme();

	if (sceneMode && currentScene) {
		if (!force && app.querySelector(".inspector-scene")) {
			updateSceneFieldValues();
			return;
		}
		app.innerHTML = buildSceneSettingsHtml(currentScene);
		attachSceneListeners();
		return;
	}

	if (multiSelection) {
		app.innerHTML = `
			<div class="empty-state">
				<div class="empty-icon">▣▣</div>
				<div class="empty-text">${multiSelection.count} objects selected</div>
				<div class="empty-hint">Select a single object to edit its properties</div>
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
				<div class="empty-hint">Click on an object in the viewport<br/>Right-click on the viewport to edit scene settings</div>
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

// ---------- Scene Settings ----------
function buildSceneSettingsHtml(scene: Scene): string {
	const effectiveTheme = scene.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	const isOverride = scene.themeOverride !== null && scene.themeOverride !== undefined;

	return `
		<div class="inspector inspector-scene">
			<div class="section header-section">
				<div class="header-top">
					<div class="object-type-badge type-scene">SCENE</div>
					<button class="btn-icon" id="btn-close-scene" title="Close scene settings">✖</button>
				</div>
				<div class="object-id">${escapeHtml(scene.name)}</div>
			</div>

			<div class="section">
				<div class="section-title">Theme</div>
				<div class="field">
					<label class="checkbox-row">
						<input type="checkbox" data-special="theme-override-enabled" ${isOverride ? "checked" : ""} />
						<span>Override theme for this scene</span>
					</label>
				</div>
				<div class="field">
					<label>UI Theme (Global)</label>
					<select data-config-field="defaultTheme" ${isOverride ? "disabled" : ""}>
						${THEME_ORDER.map((key) => {
							const theme = THEMES[key];
							const selected = (currentConfig?.defaultTheme ?? "win98") === key ? "selected" : "";
							return `<option value="${key}" ${selected}>${theme.label}</option>`;
						}).join("")}
					</select>
				</div>
				${
					isOverride
						? `<div class="field">
							<label>Scene Theme (Override)</label>
							<select data-scene-field="themeOverride">
								${THEME_ORDER.map((key) => {
									const theme = THEMES[key];
									const selected = (scene.themeOverride ?? "win98") === key ? "selected" : "";
									return `<option value="${key}" ${selected}>${theme.label}</option>`;
								}).join("")}
							</select>
						</div>`
						: ""
				}
			</div>

			<div class="section">
				<div class="section-title">World</div>
				<div class="field-row">
					<div class="field">
						<label>Width</label>
						<input type="number" data-scene-field="worldSize.width" value="${scene.worldSize.width}" step="1" min="1" />
					</div>
					<div class="field">
						<label>Height</label>
						<input type="number" data-scene-field="worldSize.height" value="${scene.worldSize.height}" step="1" min="1" />
					</div>
				</div>
			</div>

			<div class="section">
				<div class="section-title">Appearance</div>
				<div class="field">
					<label>Background Color</label>
					<div class="color-row">
						<input type="color" data-scene-field="backgroundColor" value="${scene.backgroundColor}" />
						<input type="text" data-scene-field="backgroundColor" value="${escapeAttr(scene.backgroundColor)}" />
					</div>
				</div>
				<div class="field">
					<label>Grid Size</label>
					<input type="number" data-scene-field="gridSize" value="${scene.gridSize}" step="1" min="1" />
				</div>
			</div>

			<div class="section">
				<div class="section-title">Behavior</div>
				<div class="field">
					<label class="checkbox-row">
						<input type="checkbox" data-scene-field="snapToGrid" ${scene.snapToGrid ? "checked" : ""} />
						<span>Snap to Grid</span>
					</label>
				</div>
			</div>
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
	document.getElementById("btn-close-scene")?.addEventListener("click", () => {
		sceneMode = false;
		render(true);
	});

	// theme override checkbox
	const overrideCheckbox = app.querySelector<HTMLInputElement>('[data-special="theme-override-enabled"]');
	overrideCheckbox?.addEventListener("change", () => {
		const checked = overrideCheckbox.checked;
		const value = checked ? (currentConfig?.defaultTheme ?? "win98") : null;
		vscode.postMessage({ type: "updateSceneField", field: "themeOverride", value, historyLabel: "toggle theme override" });
	});

	// config field (defaultTheme)
	const configInputs = app.querySelectorAll<HTMLSelectElement>("[data-config-field]");
	for (const input of configInputs) {
		const field = input.dataset.configField!;
		input.addEventListener("change", () => {
			vscode.postMessage({ type: "updateConfig", key: field, value: input.value });
		});
	}

	// scene fields
	const inputs = app.querySelectorAll<HTMLInputElement | HTMLSelectElement>("[data-scene-field]");
	for (const input of inputs) {
		const field = input.dataset.sceneField!;

		if (input instanceof HTMLSelectElement) {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field, value: input.value, historyLabel: `scene: ${field}` });
			});
		} else if (input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) {
					vscode.postMessage({ type: "updateSceneField", field, value, historyLabel: `scene: ${field}` });
				}
			});
		} else if (input.type === "checkbox") {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field, value: input.checked, historyLabel: `scene: ${field}` });
			});
		} else if (input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) {
					textInput.value = input.value;
				}
				vscode.postMessage({ type: "updateSceneField", field, value: input.value, historyLabel: `scene: ${field}` });
			});
		} else {
			input.addEventListener("change", () => {
				vscode.postMessage({ type: "updateSceneField", field, value: input.value, historyLabel: `scene: ${field}` });
			});
		}
	}
}

// ---------- Object Inspector ----------
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
				${
					obj.texture
						? `<div class="field">
							<label>Texture</label>
							<div class="texture-row">
								<span>🖼️</span>
								<span>${escapeHtml(obj.texture)}</span>
							</div>
						</div>`
						: ""
				}
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

function attachEventListeners(): void {
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

function sendFieldUpdate(field: string, value: unknown): void {
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
				const activeEl = document.activeElement;
				if (activeEl instanceof HTMLSelectElement && activeEl.dataset.sceneField === "themeOverride") {
					break;
				}
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
		case "configUpdated":
			currentConfig = msg.config;
			applyEffectiveTheme();
			if (sceneMode) {
				render(true);
			}
			break;
	}
});

render(true);
vscode.postMessage({ type: "inspectorReady" });
vscode.postMessage({ type: "requestConfig" });
