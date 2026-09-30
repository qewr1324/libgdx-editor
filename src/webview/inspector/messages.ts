// src/webview/inspector/messages.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import { getLayerNameOfObject } from "../../types/scene.js";
import { vscode, app } from "./vscode-api.js";
import { setCurrentObject, setCurrentScene, setCurrentConfig, setMultiSelection, setSceneMode, setAvailableLayers, setLastAppliedTheme, lastAppliedTheme, availableLayers, currentObject, currentScene } from "./state.js";
import { escapeAttr, escapeHtml } from "./utils.js";
import { render } from "./render/index.js";

export function setupMessages(): void {
	window.addEventListener("message", (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "showObject":
				setMultiSelection(null);
				setSceneMode(false);
				setCurrentObject(msg.object as GameObject);
				render(false);
				break;

			case "showMultiSelection":
				setSceneMode(false);
				setMultiSelection({ count: msg.count, ids: msg.ids });
				render(true);
				break;

			case "showScene":
				setCurrentScene(msg.scene as Scene);
				if (sceneModeActive()) {
					void import("./render/scene-settings.js").then((m) => m.updateSceneFieldValues(msg.scene as Scene));
				}
				break;

			case "showSceneSettings":
				setCurrentScene(msg.scene as Scene);
				setSceneMode(true);
				setCurrentObject(null);
				setMultiSelection(null);
				render(true);
				break;

			case "layersLoaded":
				setAvailableLayers(msg.layers ?? []);
				if (currentObject && !sceneModeActive()) {
					const layerSelect = app.querySelector<HTMLSelectElement>("[data-layer-select]");
					if (layerSelect) {
						const obj = currentObject;
						const scene = currentScene;
						const currentLayerId = obj.layerId ?? (scene ? scene.layers.find((l) => getLayerNameOfObject(scene, obj) === l.name)?.id : undefined) ?? "";
						layerSelect.innerHTML = availableLayers
							.map((l) => {
								const selected = l.id === currentLayerId ? "selected" : "";
								return `<option value="${escapeAttr(l.id)}" ${selected}>${escapeHtml(l.name)}</option>`;
							})
							.join("");
					}
				}
				break;

			case "clearSelection":
				setMultiSelection(null);
				setCurrentObject(null);
				setSceneMode(false);
				render(true);
				break;

			case "configLoaded":
			case "configUpdated": {
				setCurrentConfig(msg.config as LibGdxEditorConfigMessage);
				const previousTheme = lastAppliedTheme;
				void import("./theme.js").then((m) => {
					m.applyEffectiveTheme();
					const themeChanged = previousTheme !== lastAppliedTheme;
					if (sceneModeActive() && themeChanged) {
						render(true);
					}
				});
				break;
			}
		}
	});
}

function sceneModeActive(): boolean {
	return document.querySelector(".inspector-scene") !== null;
}
