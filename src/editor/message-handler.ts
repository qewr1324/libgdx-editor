import type * as vscode from "vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import type { Scene } from "../types/scene.js";
import type { LevelConfig } from "../types/level-config.js";
import { AssetManager } from "./assetManager.js";
import { ConfigManager } from "../config/config-manager.js";
import { LevelConfigManager } from "./levelConfigManager.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { SceneRegistry } from "./scene-registry.js";
import { parseDocument, writeDocument, saveDocument } from "./scene-parser.js";
import { addObjectToScene, createObjectAt, createShapeAt, deleteObjectFromScene, updateObjectsInScene } from "./scene-mutations.js";
import { importTextureAtOp, importTextureDialogOp } from "./scene-ops/addObjectOps.js";
import { deleteObjectOp, duplicateObjectsOp, updateObjectOp } from "./scene-ops/objectOps.js";
import { updateSceneFieldOp } from "./scene-ops/sceneFieldOps.js";
import { undoOp, redoOp } from "./scene-ops/historyOps.js";
import type { SceneHost } from "./scene-types.js";

export interface MessageHandlerContext {
	host: SceneHost;
	document: vscode.TextDocument;
	webviewPanel: vscode.WebviewPanel;
	markNotDirty(): void;
	getIsProgrammaticChange(): boolean;
	setProgrammaticChange(value: boolean): void;
}

export async function handleWebviewMessage(msg: WebviewToExtensionMessage, ctx: MessageHandlerContext): Promise<void> {
	const host = ctx.host;

	switch (msg.type) {
		case "ready":
			await sendScene(ctx);
			break;
		case "save":
			await handleSave(msg, ctx);
			break;
		case "sceneChanged":
			handleSceneChanged(msg, ctx);
			break;
		case "selectObject": {
			SceneRegistry.setActiveInstance(host);
			const scene = host.getScene() ?? parseDocument(ctx.document);
			const ids = msg.objectId ? [msg.objectId] : [];
			SceneRegistry.emitSelection(host, ids, scene);
			break;
		}
		case "selectObjects": {
			SceneRegistry.setActiveInstance(host);
			const scene = host.getScene() ?? parseDocument(ctx.document);
			SceneRegistry.emitSelection(host, msg.objectIds, scene);
			break;
		}
		case "requestAddObject": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createObjectAt(msg.objectType, msg.x, msg.y);
			const updated = addObjectToScene(scene, newObj);
			host.setScene(updated);
			host.markDirty();
			host.pushHistory(updated, `add ${msg.objectType}`);
			host.broadcastUpdate(updated);
			host.broadcastHistoryState();
			break;
		}
		case "requestAddShape": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createShapeAt(msg.shapeType, msg.x, msg.y);
			const updated = addObjectToScene(scene, newObj);
			host.setScene(updated);
			host.markDirty();
			host.pushHistory(updated, `add ${msg.shapeType}`);
			host.broadcastUpdate(updated);
			host.broadcastHistoryState();

			// ✅ lastShapeType را در level config ذخیره کن
			await LevelConfigManager.update(ctx.document.uri, { ui: { lastShapeType: msg.shapeType } });
			await broadcastLevelConfig(ctx);
			break;
		}
		case "requestAddTexture":
			await importTextureAtOp(host, msg.x, msg.y);
			break;
		case "requestImportTexture":
			await importTextureDialogOp(host);
			break;
		case "updateObject":
			updateObjectOp(host, msg.object, msg.historyLabel ?? "update object");
			break;
		case "updateObjects": {
			const current = host.getScene();
			if (!current) break;
			const updated = updateObjectsInScene(current, msg.objects);
			host.setScene(updated);
			host.markDirty();
			host.pushHistory(updated, msg.historyLabel ?? "update objects");
			host.broadcastUpdate(updated);
			host.broadcastHistoryState();
			break;
		}
		case "updateSceneField":
			updateSceneFieldOp(host, msg.field, msg.value, msg.historyLabel ?? `update ${msg.field}`);
			break;
		case "deleteObject":
			deleteObjectOp(host, msg.objectId);
			break;
		case "deleteObjects": {
			const current = host.getScene();
			if (!current) break;
			let updated = current;
			for (const id of msg.objectIds) {
				updated = deleteObjectFromScene(updated, id);
			}
			host.setScene(updated);
			host.markDirty();
			host.pushHistory(updated, "delete objects");
			host.broadcastUpdate(updated);
			host.broadcastHistoryState();
			break;
		}
		case "pasteObjects": {
			const current = host.getScene();
			if (!current) break;
			let updated = current;
			for (const obj of msg.objects) {
				updated = addObjectToScene(updated, obj);
			}
			host.setScene(updated);
			host.markDirty();
			host.pushHistory(updated, msg.historyLabel ?? "paste");
			host.broadcastUpdate(updated);
			host.broadcastHistoryState();
			break;
		}
		case "duplicateObjects":
			duplicateObjectsOp(host, msg.objectIds, msg.offsetX, msg.offsetY);
			break;
		case "openSceneSettings": {
			SceneRegistry.setActiveInstance(host);
			const scene = host.getScene() ?? parseDocument(ctx.document);
			SceneRegistry.emitSceneSettings(host, scene);
			break;
		}
		case "undo":
			undoOp(host);
			break;
		case "redo":
			redoOp(host);
			break;
		case "updateConfig": {
			const config = ConfigManager.getInstance();
			await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
			break;
		}
		case "requestConfig": {
			const config = ConfigManager.getInstance().get();
			ctx.webviewPanel.webview.postMessage({
				type: "configLoaded",
				config: {
					version: config.version,
					defaultTheme: config.defaultTheme,
					autoSaveDelayMs: config.autoSaveDelayMs,
					showRulers: config.showRulers,
					showGrid: config.showGrid,
					defaultGridSize: config.defaultGridSize,
				},
			} satisfies ExtensionToWebviewMessage);
			break;
		}
		case "requestLevelConfig":
			await broadcastLevelConfig(ctx);
			break;
		case "updateLevelConfig": {
			const current = await LevelConfigManager.load(ctx.document.uri);
			const updated = mergeLevelConfig(current, msg.partial);
			await LevelConfigManager.save(ctx.document.uri, updated);

			// اعمال فوری روی scene.snapToGrid و gridSize اگر تغییر کرده
			if (msg.partial.grid) {
				const scene = host.getScene();
				if (scene) {
					if (typeof msg.partial.grid.snap === "boolean" && scene.snapToGrid !== msg.partial.grid.snap) {
						updateSceneFieldOp(host, "snapToGrid", msg.partial.grid.snap, "toggle snap");
					}
					if (typeof msg.partial.grid.size === "number" && scene.gridSize !== msg.partial.grid.size) {
						updateSceneFieldOp(host, "gridSize", msg.partial.grid.size, "grid size");
					}
				}
			}

			// broadcast به همه وب‌ویوهای این host
			await broadcastLevelConfig(ctx);
			break;
		}
	}
}

function mergeLevelConfig(current: LevelConfig, partial: Partial<LevelConfig>): LevelConfig {
	return {
		version: partial.version ?? current.version,
		view: { ...current.view, ...(partial.view ?? {}) },
		gizmo: { ...current.gizmo, ...(partial.gizmo ?? {}) },
		grid: { ...current.grid, ...(partial.grid ?? {}) },
		ui: { ...current.ui, ...(partial.ui ?? {}) },
	};
}

async function broadcastLevelConfig(ctx: MessageHandlerContext): Promise<void> {
	const config = await LevelConfigManager.load(ctx.document.uri);
	ctx.host.postToWebview({ type: "levelConfigLoaded", config });
}

export async function sendScene(ctx: MessageHandlerContext): Promise<void> {
	const host = ctx.host;
	const scene = parseDocument(ctx.document);
	host.setScene(scene);
	host.resetHistory(scene);

	ctx.webviewPanel.webview.postMessage({ type: "load", scene } satisfies ExtensionToWebviewMessage);

	const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, scene);
	ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	const config = ConfigManager.getInstance().get();
	ctx.webviewPanel.webview.postMessage({
		type: "configLoaded",
		config: {
			version: config.version,
			defaultTheme: config.defaultTheme,
			autoSaveDelayMs: config.autoSaveDelayMs,
			showRulers: config.showRulers,
			showGrid: config.showGrid,
			defaultGridSize: config.defaultGridSize,
		},
	} satisfies ExtensionToWebviewMessage);

	const levelConfig = await LevelConfigManager.load(ctx.document.uri);
	ctx.webviewPanel.webview.postMessage({ type: "levelConfigLoaded", config: levelConfig } satisfies ExtensionToWebviewMessage);

	host.broadcastHistoryState();

	if (host.isActive()) {
		SceneRegistry.emitSceneChange(host, scene);
	}
}

export async function sendSceneUpdate(ctx: MessageHandlerContext): Promise<void> {
	if (ctx.getIsProgrammaticChange()) return;

	const host = ctx.host;
	const fileScene = parseDocument(ctx.document);

	const currentScene = host.getScene();
	if (currentScene) {
		try {
			if (JSON.stringify(currentScene) === JSON.stringify(fileScene)) return;
		} catch {
			// ignore
		}
	}

	host.setScene(fileScene);
	ctx.webviewPanel.webview.postMessage({ type: "load", scene: fileScene } satisfies ExtensionToWebviewMessage);

	const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, fileScene);
	ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	if (host.isActive()) {
		SceneRegistry.emitSceneChange(host, fileScene);
	}
}

async function handleSave(msg: { scene: Scene }, ctx: MessageHandlerContext): Promise<void> {
	ctx.setProgrammaticChange(true);

	try {
		ctx.host.setScene(msg.scene);
		await writeDocument(ctx.document, msg.scene);
		await saveDocument(ctx.document);
		ctx.markNotDirty();

		if (ctx.host.isActive()) {
			SceneRegistry.emitSceneChange(ctx.host, msg.scene);
		}
	} finally {
		setTimeout(() => {
			ctx.setProgrammaticChange(false);
		}, 50);
	}
}

function handleSceneChanged(msg: { scene: Scene }, ctx: MessageHandlerContext): void {
	ctx.host.setScene(msg.scene);
	ctx.host.markDirty();
	ctx.host.pushHistory(msg.scene, "scene changed");
	ctx.host.broadcastHistoryState();
	if (ctx.host.isActive()) {
		SceneRegistry.emitSceneChange(ctx.host, msg.scene);
	}
}
