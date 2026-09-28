import { vscode } from "./types.js";
import { loadTexture } from "./pixi/textures.js";
import { renderScene } from "./render/scene.js";
import { interactionMode, scene, selectedIds, viewport } from "./state.js";
import { selectObjects } from "./selection/selection.js";
import { findObject } from "./utils/geometry.js";
import { applyTheme } from "./theme/theme-manager.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import type { Scene } from "../../types/scene.js";

let pendingRender: (() => void) | null = null;
let currentConfig: LibGdxEditorConfigMessage | null = null;
let currentSceneFromMessage: Scene | null = null;
let lastAppliedThemeName: string | null = null;

function scheduleRender(callback: () => void): void {
	if (interactionMode !== "idle") {
		pendingRender = callback;
		return;
	}
	callback();
}

export function flushPendingRender(): void {
	if (pendingRender && interactionMode === "idle") {
		const cb = pendingRender;
		pendingRender = null;
		cb();
	}
}

function applyEffectiveTheme(): void {
	const themeName = currentSceneFromMessage?.themeOverride ?? currentConfig?.defaultTheme ?? "win98";
	console.log("[Viewport] applyEffectiveTheme:", themeName, "(last:", lastAppliedThemeName, ")");
	if (themeName === lastAppliedThemeName) return;
	lastAppliedThemeName = themeName;
	console.log("[Viewport] applying theme:", themeName);
	// ✅ force=true تا مطمئن شویم اعمال می‌شود — باگ ۶ رفع شد
	applyTheme(themeName, true);
}

export function setupMessages(): void {
	window.addEventListener("message", async (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "load":
			case "update":
				currentSceneFromMessage = msg.scene;
				applyEffectiveTheme();
				scheduleRender(() => renderScene(msg.scene));
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
				scheduleRender(() => {
					if (scene) renderScene(scene);
				});
				break;
			}
			case "configLoaded":
			case "configUpdated":
				console.log("[Viewport] configLoaded/configUpdated received:", msg.config);
				currentConfig = msg.config;
				applyEffectiveTheme();
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

	vscode.postMessage({ type: "requestConfig" });
}
