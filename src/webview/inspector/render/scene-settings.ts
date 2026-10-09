// src/webview/inspector/render/scene-settings.ts
import type { Scene } from "../../../types/scene.js";
import { THEMES, THEME_ORDER } from "../theme-types.js";
import { vscode } from "../vscode-api.js";
import { currentConfig, currentScene, setSceneMode } from "../state.js";
import { ICONS } from "../icons.js";
import { escapeAttr, escapeHtml } from "../utils.js";
import { sectionWrap, field, fieldRow, numberField } from "./section-helpers.js";
import { attachSectionListeners } from "../events/section-listeners.js";
import { attachDragHandles } from "../events/drag-handles.js";
import { app } from "../vscode-api.js";

// ============================================================
// Build
// ============================================================

export function buildSceneSettingsHtml(scene: Scene): string {
	const isOverride = scene.themeOverride !== null && scene.themeOverride !== undefined;

	// 🆕 Assets section
	const assetsSection = buildAssetsSection();

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

	const safeAreaSection = buildSafeAreaSection(scene);

	return `
		<div class="inspector inspector-scene">
			<div class="inspector-header scene">
				<div class="inspector-header-icon">${ICONS.scene}</div>
				<div class="inspector-header-title">${escapeHtml(scene.name)}</div>
				<button class="inspector-header-btn" id="btn-close-scene" title="Close">✖</button>
			</div>
			${assetsSection}
			${themeSection}
			${worldSection}
			${appearanceSection}
			${behaviorSection}
			${safeAreaSection}
		</div>
	`;
}

// ============================================================
// 🆕 Assets Section
// ============================================================

function buildAssetsSection(): string {
	const assetsPath = currentConfig?.assetsPath ?? "";
	const hasPath = assetsPath.trim().length > 0;

	return sectionWrap(
		"scene-assets",
		"📁 Assets Folder",
		`
			<div class="inspector-field wide">
				<label class="inspector-field-label">Path (relative to workspace)</label>
				<div class="inspector-asset-row">
					<input
						type="text"
						data-assets-path
						value="${escapeAttr(assetsPath)}"
						placeholder="e.g. assets/"
						readonly
					/>
					<button class="inspector-asset-btn" data-assets-action="pick" title="Choose folder">
						📂 Browse
					</button>
				</div>
			</div>
			${hasPath ? `<div class="inspector-hint">✔ Using: <code>${escapeHtml(assetsPath)}</code></div>` : `<div class="inspector-hint" style="color:#ffaa44;">⚠ No assets folder set. All import operations will require you to set it first.</div>`}
			<div class="inspector-hint">
				All images must be placed inside this folder. Import dialogs will only browse this location.
			</div>
		`,
	);
}

// ============================================================
// Safe Area Section
// ============================================================

function buildSafeAreaSection(scene: Scene): string {
	const sa = scene.safeArea;

	if (!sa) {
		return sectionWrap(
			"scene-safe-area",
			"🎯 Camera Safe Area",
			`
			<div class="inspector-hint">No safe area defined.</div>
			<button class="inspector-atlas-btn" data-safe-area-action="add" style="width:100%;justify-content:center;">
				🎯 Add Safe Area
			</button>
		`,
		);
	}

	return sectionWrap(
		"scene-safe-area",
		"🎯 Camera Safe Area",
		`
			<div class="inspector-field wide">
				<label class="inspector-checkbox-row">
					<input type="checkbox" data-safe-area-field="visible" ${sa.visible ? "checked" : ""} />
					<span>Visible</span>
				</label>
			</div>
			<div class="inspector-field wide">
				<label class="inspector-checkbox-row">
					<input type="checkbox" data-safe-area-field="dashed" ${sa.dashed ? "checked" : ""} />
					<span>Dashed border</span>
				</label>
			</div>

			${field("Label", `<input type="text" data-safe-area-field="label" value="${escapeAttr(sa.label)}" />`)}

			${fieldRow(numberField("X", "safe-area-x", sa.x, { step: 1 }), numberField("Y", "safe-area-y", sa.y, { step: 1 }))}
			${fieldRow(numberField("W", "safe-area-width", sa.width, { step: 1, min: 1 }), numberField("H", "safe-area-height", sa.height, { step: 1, min: 1 }))}

			<div class="inspector-field wide">
				<label class="inspector-field-label">Color</label>
				<div class="inspector-color-row">
					<input type="color" data-safe-area-field="color" value="${escapeAttr(sa.color)}" />
					<input type="text" data-safe-area-field="color" value="${escapeAttr(sa.color)}" />
				</div>
			</div>

			<div style="display:flex;gap:6px;margin-top:6px;">
				<button class="inspector-atlas-btn" data-safe-area-action="reset-size" title="Reset to world size" style="flex:1;justify-content:center;">
					↺ Reset Size
				</button>
				<button class="inspector-atlas-btn danger" data-safe-area-action="remove" title="Remove safe area" style="flex:1;justify-content:center;">
					🗑️ Remove
				</button>
			</div>
		`,
	);
}

// ============================================================
// Update field values
// ============================================================

export function updateSceneFieldValues(scene: Scene): void {
	setSceneFieldValue("worldSize.width", scene.worldSize.width, "number");
	setSceneFieldValue("worldSize.height", scene.worldSize.height, "number");
	setSceneFieldValue("backgroundColor", scene.backgroundColor, "color");
	setSceneFieldValue("backgroundColor", scene.backgroundColor, "text");
	setSceneFieldValue("gridSize", scene.gridSize, "number");
	setSceneFieldValue("snapToGrid", scene.snapToGrid, "checkbox");

	// 🆕 assets path
	setAssetsPathValue(currentConfig?.assetsPath ?? "");

	updateSafeAreaFieldValues(scene);
}

function setAssetsPathValue(value: string): void {
	const el = app.querySelector<HTMLInputElement>("[data-assets-path]");
	if (el && document.activeElement !== el && el.value !== value) {
		el.value = value;
	}
}

function updateSafeAreaFieldValues(scene: Scene): void {
	const sa = scene.safeArea;
	if (!sa) return;

	setSafeAreaValue("visible", sa.visible, "checkbox");
	setSafeAreaValue("dashed", sa.dashed, "checkbox");
	setSafeAreaValue("label", sa.label, "text");
	setSafeAreaValue("color", sa.color, "color");
	setSafeAreaValue("color", sa.color, "text");
	setSafeAreaValue("safe-area-x", sa.x, "number");
	setSafeAreaValue("safe-area-y", sa.y, "number");
	setSafeAreaValue("safe-area-width", sa.width, "number");
	setSafeAreaValue("safe-area-height", sa.height, "number");
}

function setSafeAreaValue(field: string, value: unknown, kind: "number" | "text" | "color" | "checkbox"): void {
	const elements = app.querySelectorAll<HTMLInputElement>(`[data-safe-area-field="${field}"], [data-field="${field}"]`);

	for (const el of elements) {
		if (document.activeElement === el) continue;
		const colorRow = el.closest(".inspector-color-row");
		if (colorRow && colorRow.contains(document.activeElement)) continue;

		if (kind === "color" && el.type !== "color") continue;
		if (kind === "text" && el.type !== "text") continue;
		if (kind === "number" && el.type !== "number") continue;
		if (kind === "checkbox" && el.type !== "checkbox") continue;

		if (el instanceof HTMLInputElement && el.type === "checkbox") {
			if (el.checked === value) continue;
			el.checked = value as boolean;
		} else if (el instanceof HTMLInputElement) {
			if (el.value === String(value)) continue;
			el.value = String(value);
		}
	}
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

// ============================================================
// Listeners
// ============================================================

export function attachSceneListeners(): void {
	attachSectionListeners();

	document.getElementById("btn-close-scene")?.addEventListener("click", () => {
		setSceneMode(false);
		void import("../render/index.js").then((m) => m.render(true));
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

	// 🆕 Assets listeners
	attachAssetsListeners();

	attachSafeAreaListeners();

	attachDragHandles("scene");
}

function attachAssetsListeners(): void {
	const pickBtn = app.querySelector<HTMLButtonElement>('[data-assets-action="pick"]');
	pickBtn?.addEventListener("click", () => {
		vscode.postMessage({ type: "pickAssetsFolder" });
	});
}

function attachSafeAreaListeners(): void {
	const buttons = app.querySelectorAll<HTMLButtonElement>("[data-safe-area-action]");
	for (const btn of buttons) {
		btn.addEventListener("click", () => {
			const action = btn.dataset.safeAreaAction;

			if (action === "add") {
				vscode.postMessage({ type: "addSafeArea" });
			} else if (action === "remove") {
				vscode.postMessage({ type: "removeSafeArea" });
			} else if (action === "reset-size") {
				const scene = currentScene;
				if (scene) {
					vscode.postMessage({
						type: "updateSafeArea",
						updates: {
							x: 0,
							y: 0,
							width: scene.worldSize.width,
							height: scene.worldSize.height,
						},
					});
				}
			}
		});
	}

	const fields = app.querySelectorAll<HTMLInputElement>("[data-safe-area-field], [data-field^='safe-area-']");
	for (const input of fields) {
		const fieldName = input.dataset.safeAreaField ?? input.dataset.field;
		if (!fieldName) continue;

		if (input.type === "checkbox") {
			input.addEventListener("change", () => {
				sendSafeAreaUpdate(fieldName, input.checked);
			});
		} else if (input.type === "number") {
			input.addEventListener("change", () => {
				const value = Number.parseFloat(input.value);
				if (!Number.isNaN(value)) sendSafeAreaUpdate(fieldName, value);
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		} else if (input.type === "color") {
			input.addEventListener("input", () => {
				const textInput = input.parentElement?.querySelector<HTMLInputElement>('input[type="text"]');
				if (textInput && document.activeElement !== textInput) {
					textInput.value = input.value;
				}
				sendSafeAreaUpdate(fieldName, input.value);
			});
		} else {
			input.addEventListener("change", () => {
				sendSafeAreaUpdate(fieldName, input.value);
			});
			input.addEventListener("keydown", (e) => {
				if (e.key === "Enter") input.blur();
			});
		}
	}
}

function sendSafeAreaUpdate(fieldName: string, value: unknown): void {
	let key = fieldName;
	if (fieldName === "safe-area-x") key = "x";
	else if (fieldName === "safe-area-y") key = "y";
	else if (fieldName === "safe-area-width") key = "width";
	else if (fieldName === "safe-area-height") key = "height";

	vscode.postMessage({
		type: "updateSafeArea",
		updates: { [key]: value },
	});
}
