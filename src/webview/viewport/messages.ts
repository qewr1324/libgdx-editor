// src/webview/viewport/messages.ts
import { vscode } from "./types.js";
import { loadTexture } from "./pixi/textures.js";
import { renderScene } from "./render/scene.js";
import { redrawGrid } from "./render/grid.js";
import { interactionMode, scene, selectedIds, setBrokenAssets, viewport } from "./state.js";
import { selectObjects, drawSelectionOutlines } from "./selection/selection.js";
import { findObject } from "./utils/geometry.js";
import { applyTheme } from "./theme/theme-manager.js";
import { setConfig, getConfig } from "./config-store.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import type { Scene } from "../../types/scene.js";

let pendingRender: (() => void) | null = null;
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
	const config = getConfig();
	const themeName = currentSceneFromMessage?.themeOverride ?? config?.defaultTheme ?? "win98";
	if (themeName === lastAppliedThemeName) return;
	lastAppliedThemeName = themeName;
	applyTheme(themeName, true);
}

function handleConfig(config: LibGdxEditorConfigMessage): void {
	const previous = getConfig();
	setConfig(config);

	applyEffectiveTheme();

	const viewChanged = !previous || previous.view.renderMode !== config.view.renderMode || previous.view.showGrid !== config.view.showGrid || previous.view.showWorldBorder !== config.view.showWorldBorder;

	if (viewChanged) {
		scheduleRender(() => {
			redrawGrid();
			if (scene) renderScene(scene);
		});
	}

	const gizmoChanged = previous && previous.gizmo.mode !== config.gizmo.mode;
	if (gizmoChanged) {
		drawSelectionOutlines();
	}

	// ✅ event برای toolbar و snapping
	// toolbar.ts به این event گوش می‌ده و rebuild می‌کنه
	// snapping/index.ts به این event گوش می‌ده و refreshSnapConfig می‌کنه
	window.dispatchEvent(new CustomEvent("config-changed", { detail: { config } }));
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
			case "brokenAssets":
				setBrokenAssets(msg.paths as string[]);
				scheduleRender(() => {
					if (scene) renderScene(scene);
				});
				break;
			case "clipboardChanged":
				break;
			case "configLoaded":
			case "configUpdated":
				handleConfig(msg.config);
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
