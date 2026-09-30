// src/webview/components/messages.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import { vscode } from "./vscode-api.js";
import { setCurrentObject, setCurrentConfig, setMultiSelection, setAtlasRegions, clearAtlasPending, currentObject } from "./state.js";
import type { AtlasRegionInfo } from "./types.js";
import { render } from "./render.js";

function findObjectInScene(scene: Scene, id: string): GameObject | null {
	for (const layer of scene.layers) {
		const found = findInObjects(layer.objects, id);
		if (found) return found;
	}
	return null;
}

function findInObjects(objects: GameObject[], id: string): GameObject | null {
	for (const obj of objects) {
		if (obj.id === id) return obj;
		if (obj.children) {
			const found = findInObjects(obj.children, id);
			if (found) return found;
		}
	}
	return null;
}

export function setupMessages(): void {
	window.addEventListener("message", (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "showObject":
				setMultiSelection(null);
				setCurrentObject(msg.object as GameObject);
				render(false);
				break;

			case "showMultiSelection":
				setMultiSelection({ count: msg.count, ids: msg.ids });
				render(true);
				break;

			case "clearSelection":
				setMultiSelection(null);
				setCurrentObject(null);
				render(true);
				break;

			case "sceneUpdate": {
				const scene = msg.scene as Scene;
				if (currentObject) {
					const updated = findObjectInScene(scene, currentObject.id);
					if (updated) {
						setCurrentObject(updated);
						render(true);
					}
				}
				break;
			}

			case "configLoaded":
			case "configUpdated":
				setCurrentConfig(msg.config as LibGdxEditorConfigMessage);
				void import("./theme.js").then((m) => m.applyEffectiveTheme());
				break;

			case "atlasRegionsLoaded": {
				const texturePath = msg.texturePath as string;
				const regions = msg.regions as AtlasRegionInfo[];
				setAtlasRegions(texturePath, regions);
				render(false);
				break;
			}

			case "atlasNotFound": {
				const texturePath = msg.texturePath as string;
				clearAtlasPending(texturePath);
				break;
			}
		}
	});

	vscode.postMessage({ type: "requestConfig" });
}
