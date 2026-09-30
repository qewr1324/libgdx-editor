// src/webview/inspector/render/index.ts
import { applyEffectiveTheme } from "../theme.js";
import { currentObject, currentObjectId, currentScene, multiSelection, sceneMode, setCurrentObjectId } from "../state.js";
import { app } from "../vscode-api.js";
import { buildSceneSettingsHtml, updateSceneFieldValues, attachSceneListeners } from "./scene-settings.js";
import { buildInspectorHtml, updateFieldValues, attachObjectListeners } from "./object-inspector.js";

export function render(force = false): void {
	applyEffectiveTheme();

	if (sceneMode && currentScene) {
		if (!force && app.querySelector(".inspector-scene")) {
			updateSceneFieldValues(currentScene);
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
		setCurrentObjectId(null);
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
		setCurrentObjectId(null);
		return;
	}

	if (!force && currentObjectId === currentObject.id && app.querySelector(".inspector:not(.inspector-scene)")) {
		updateFieldValues(currentObject, currentScene);
		return;
	}

	setCurrentObjectId(currentObject.id);
	app.innerHTML = buildInspectorHtml(currentObject);
	attachObjectListeners();
}

export { buildSceneSettingsHtml, buildInspectorHtml };
