// src/webview/inspector/messages.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import { getLayerNameOfObject } from "../../types/scene.js";
import { app } from "./vscode-api.js";
import { setCurrentObject, setCurrentScene, setCurrentConfig, setMultiSelection, setSceneMode, setAvailableLayers, setLastAppliedTheme, setAtlasRegions, setAtlasNotFound, setAtlasTextureInfo, lastAppliedTheme, availableLayers, currentObject, currentScene, sceneMode } from "./state.js";
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
				if (sceneMode) {
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
				if (currentObject && !sceneMode) {
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

			// 🆕 Atlas regions
			case "atlasRegionsLoaded":
				setAtlasRegions(msg.texturePath as string, msg.atlasPath as string, msg.regions ?? []);
				render(true);
				break;

			case "atlasNotFound":
				setAtlasNotFound(msg.texturePath as string);
				render(true);
				break;

			// 🆕 Textures (برای preview)
			case "texturesLoaded": {
				const textures = msg.textures as Record<string, string>;
				let needsRerender = false;
				for (const [path, dataUrl] of Object.entries(textures)) {
					if (currentObject && isCurrentObjectTexture(path)) {
						const img = new Image();
						img.onload = () => {
							setAtlasTextureInfo(path, img.naturalWidth, img.naturalHeight, dataUrl);
							if (currentObject && isCurrentObjectTexture(path)) {
								render(true);
							}
						};
						img.src = dataUrl;
						needsRerender = true;
					}
				}
				if (!needsRerender && currentObject) {
					const props = currentObject.properties?.atlas as { texture?: string } | undefined;
					if (props?.texture && textures[props.texture]) {
						render(true);
					}
				}
				break;
			}

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
					if (sceneMode && themeChanged) {
						render(true);
					}
				});
				break;
			}
		}
	});
}

function isCurrentObjectTexture(path: string): boolean {
	if (!currentObject) return false;
	const raw = currentObject.properties?.atlas as { texture?: string } | undefined;
	return !!raw && raw.texture === path;
}
