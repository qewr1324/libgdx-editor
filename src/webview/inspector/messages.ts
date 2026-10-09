// src/webview/viewport/messages.ts
import { vscode } from "./types.js";
import { loadTexture } from "./pixi/textures.js";
import { renderScene, clearSubTextureCache } from "./render/scene.js";
import { redrawGrid } from "./render/grid.js";
import { renderReference } from "./render/reference.js";
import { renderSafeArea } from "./render/safe-area.js";
import { interactionMode, scene, selectedIds, setBrokenAssets, setScene, viewport, textureCache } from "./state.js";
import { selectObjects, drawSelectionOutlines } from "./selection/selection.js";
import { findObject } from "./utils/geometry.js";
import { applyTheme } from "./theme/theme-manager.js";
import { setConfig, getConfig } from "./config-store.js";
import { registerAtlas } from "./features/texture-atlas/atlas-picker.js";
import { renderGuides } from "./ui/guides.js";
import type { AtlasData } from "../../features/texture-atlas/atlas-types.js";
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

function textureCacheHas(path: string): boolean {
	return textureCache.has(path);
}

function notifySceneChanged(): void {
	window.dispatchEvent(new CustomEvent("scene-changed"));
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

	window.dispatchEvent(new CustomEvent("config-changed", { detail: { config } }));
}

export function setupMessages(): void {
	window.addEventListener("message", async (event) => {
		const msg = event.data;
		switch (msg.type) {
			case "load":
			case "update":
				// 🆕 اگه وسط یه interaction هستیم، load رو نادیده بگیر
				// (چون host.scene هنوز در حال sync هست و ممکنه قدیمی باشه)
				if (interactionMode !== "idle") {
					console.log("[viewport] ignoring load/update during interaction:", interactionMode);
					break;
				}

				currentSceneFromMessage = msg.scene;
				applyEffectiveTheme();
				clearSubTextureCache();
				setScene(msg.scene);
				scheduleRender(() => {
					renderScene(msg.scene);
					renderReference(msg.scene);
					renderSafeArea(msg.scene);
					renderGuides();
					notifySceneChanged();
				});
				break;

			case "texturesLoaded": {
				const textures = msg.textures as Record<string, string>;
				let anyLoaded = false;
				for (const [path, dataUrl] of Object.entries(textures)) {
					try {
						const had = textureCacheHas(path);
						await loadTexture(path, dataUrl);
						if (!had) anyLoaded = true;
					} catch (err) {
						console.error("Failed to load texture:", path, err);
					}
				}
				if (anyLoaded) {
					clearSubTextureCache();
				}
				scheduleRender(() => {
					if (scene) {
						renderScene(scene);
						renderReference(scene);
					}
				});
				break;
			}

			case "atlasRegionsLoaded": {
				const atlasData: AtlasData = {
					texturePath: msg.texturePath,
					atlasPath: msg.atlasPath,
					regions: (msg.regions as Array<{ name: string; x: number; y: number; width: number; height: number; rotate: boolean; index: number }>).map((r) => ({
						name: r.name,
						x: r.x,
						y: r.y,
						width: r.width,
						height: r.height,
						origWidth: r.width,
						origHeight: r.height,
						offsetX: 0,
						offsetY: 0,
						rotate: r.rotate,
						index: r.index,
					})),
				};

				registerAtlas(msg.texturePath, atlasData);
				clearSubTextureCache();

				scheduleRender(() => {
					if (scene) renderScene(scene);
				});
				break;
			}

			case "atlasNotFound":
				break;

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

			case "selectObjects": {
				const incoming: string[] = msg.objectIds;
				const currentSet = new Set(selectedIds);
				const same = incoming.length === selectedIds.length && incoming.every((id) => currentSet.has(id));
				if (!same) {
					selectObjects(incoming, incoming[incoming.length - 1] ?? null);
				}
				break;
			}

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
