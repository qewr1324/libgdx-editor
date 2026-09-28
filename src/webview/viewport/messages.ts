import { vscode } from "./types.js";
import { loadTexture } from "./pixi/textures.js";
import { renderScene } from "./render/scene.js";
import { scene, setScene, selectedIds, viewport } from "./state.js";
import { selectObjects } from "./selection/selection.js";
import { findObject } from "./utils/geometry.js";

export function setupMessages(): void {
	window.addEventListener("message", async (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "load":
			case "update":
				renderScene(msg.scene);
				break;
			case "texturesLoaded": {
				const textures = msg.textures as Record<string, string>;
				for (const [path, dataUrl] of Object.entries(textures)) {
					try {
						await loadTexture(path, dataUrl);
					} catch (err) {
						console.error("Failed to load texture:", path, err);
					}
				}
				if (scene) renderScene(scene);
				break;
			}
			case "historyState":
				console.log("History state:", msg.canUndo, msg.canRedo);
				break;
			case "selectFromOutliner":
				if (msg.objectId) {
					selectObjects([msg.objectId], msg.objectId);
					const obj = scene ? findObject(scene, msg.objectId) : null;
					if (obj && viewport) {
						viewport.moveCenter(obj.transform.x, obj.transform.y);
					}
				} else {
					selectObjects([]);
				}
				break;
			case "selectObjects":
				if (JSON.stringify(msg.objectIds) !== JSON.stringify(selectedIds)) {
					selectObjects(msg.objectIds, msg.objectIds[msg.objectIds.length - 1] ?? null);
				}
				break;
			case "focusObject":
				if (viewport) {
					const obj = scene ? findObject(scene, msg.objectId) : null;
					if (obj) {
						viewport.moveCenter(obj.transform.x, obj.transform.y);
					}
				}
				break;
		}
	});
}
