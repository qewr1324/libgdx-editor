import type * as vscode from "vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { toConfigMessage } from "../protocol/messages.js";
import type { Scene } from "../types/scene.js";
import { AssetManager } from "./assetManager.js";
import { ConfigManager } from "../config/config-manager.js";
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
	const config = ConfigManager.getInstance();

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

			// ✅ lastShapeType در config ذخیره شود
			await config.update({ ui: { lastShapeType: msg.shapeType } });
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
			await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
			break;
		}
		case "updateConfigPartial": {
			// ✅ به‌روزرسانی تودرتو
			await config.update(msg.partial as never);

			// اگر grid.snap یا grid.size عوض شد، روی scene فعلی هم اعمال کن
			const cfg = config.get();
			const scene = host.getScene();
			if (scene && msg.partial.grid) {
				const partial = msg.partial.grid as { snap?: boolean; size?: number };
				if (typeof partial.snap === "boolean" && scene.snapToGrid !== partial.snap) {
					updateSceneFieldOp(host, "snapToGrid", partial.snap, "toggle snap");
				}
				if (typeof partial.size === "number" && scene.gridSize !== partial.size) {
					updateSceneFieldOp(host, "gridSize", partial.size, "grid size");
				}
			}
			break;
		}
		case "requestConfig": {
			ctx.webviewPanel.webview.postMessage({
				type: "configLoaded",
				config: toConfigMessage(config.get()),
			} satisfies ExtensionToWebviewMessage);
			break;
		}
	}
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
		config: toConfigMessage(config),
	} satisfies ExtensionToWebviewMessage);

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
