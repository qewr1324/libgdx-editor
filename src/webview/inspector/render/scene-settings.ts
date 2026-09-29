// src/webview/inspector/render/scene-settings.ts
import type { Scene } from "../../../types/scene.js";
import { THEMES, THEME_ORDER } from "../theme-types.js";   // ← تغییر: قبلاً ../viewport/theme/themes.js بود
import { vscode } from "../vscode-api.js";
import { currentConfig, setSceneMode } from "../state.js";
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

// ============================================================
// Update field values (وقتی پیام update میاد)
// ============================================================

export function updateSceneFieldValues(scene: Scene): void {
	setSceneFieldValue("worldSize.width", scene.worldSize.width, "number");
	setSceneFieldValue("worldSize.height", scene.worldSize.height, "number");
	setSceneFieldValue("backgroundColor", scene.backgroundColor, "color");
	setSceneFieldValue("backgroundColor", scene.backgroundColor, "text");
	setSceneFieldValue("gridSize", scene.gridSize, "number");
	setSceneFieldValue("snapToGrid", scene.snapToGrid, "checkbox");
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

	attachDragHandles("scene");
}

