import type * as vscode from "vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import type { GameObject, Scene } from "../types/scene.js";
import { AssetManager } from "./assetManager.js";
import { SceneRegistry } from "./scene-registry.js";
import { parseDocument, writeDocument } from "./scene-parser.js";
import { addObjectToScene, createObjectAt, deleteObjectFromScene, updateObjectInScene } from "./scene-mutations.js";
import { importTextureAtOp, importTextureDialogOp } from "./scene-ops/addObjectOps.js";
import { deleteObjectOp, duplicateObjectsOp } from "./scene-ops/objectOps.js";
import { updateSceneFieldOp } from "./scene-ops/sceneFieldOps.js";
import { undoOp, redoOp } from "./scene-ops/historyOps.js";
import type { SceneHost } from "./scene-types.js";

export interface MessageHandlerContext {
	host: SceneHost;
	document: vscode.TextDocument;
	webviewPanel: vscode.WebviewPanel;
	markNotDirty(): void;
	getIsProgrammaticChange(): boolean;
	clearProgrammaticChange(): void;
}

export async function handleWebviewMessage(msg: WebviewToExtensionMessage, ctx: MessageHandlerContext): Promise<void> {
	SceneRegistry.setActiveInstance(ctx.host);

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
			const scene = ctx.host.getScene() ?? parseDocument(ctx.document);
			const ids = msg.objectId ? [msg.objectId] : [];
			SceneRegistry.emitSelection(ids, scene);
			break;
		}
		case "selectObjects": {
			const scene = ctx.host.getScene() ?? parseDocument(ctx.document);
			SceneRegistry.emitSelection(msg.objectIds, scene);
			break;
		}
		case "requestAddObject": {
			if (!ctx.host.getScene()) break;
			const newObj = createObjectAt(msg.objectType, msg.x, msg.y);
			const updated = addObjectToScene(ctx.host.getScene()!, newObj);
			ctx.host.setScene(updated);
			ctx.host.markDirty();
			ctx.host.pushHistory(updated, `add ${msg.objectType}`);
			ctx.host.broadcastUpdate(updated);
			ctx.host.broadcastHistoryState();
			break;
		}
		case "requestAddTexture":
			await importTextureAtOp(msg.x, msg.y);
			break;
		case "requestImportTexture":
			await importTextureDialogOp();
			break;
		case "updateObject": {
			const current = ctx.host.getScene();
			if (!current) break;
			const updated = updateObjectInScene(current, msg.object);
			ctx.host.setScene(updated);
			ctx.host.markDirty();
			ctx.host.pushHistory(updated, msg.historyLabel ?? "update object");
			ctx.host.broadcastUpdate(updated);
			ctx.host.broadcastHistoryState();
			break;
		}
		case "updateObjects": {
			const current = ctx.host.getScene();
			if (!current) break;
			let updated = current;
			for (const obj of msg.objects) {
				updated = updateObjectInScene(updated, obj);
			}
			ctx.host.setScene(updated);
			ctx.host.markDirty();
			ctx.host.pushHistory(updated, msg.historyLabel ?? "update objects");
			ctx.host.broadcastUpdate(updated);
			ctx.host.broadcastHistoryState();
			break;
		}
		case "updateSceneField":
			updateSceneFieldOp(msg.field, msg.value, msg.historyLabel ?? `update ${msg.field}`);
			break;
		case "deleteObject":
			deleteObjectOp(msg.objectId);
			break;
		case "deleteObjects": {
			const current = ctx.host.getScene();
			if (!current) break;
			let updated = current;
			for (const id of msg.objectIds) {
				updated = deleteObjectFromScene(updated, id);
			}
			ctx.host.setScene(updated);
			ctx.host.markDirty();
			ctx.host.pushHistory(updated, "delete objects");
			ctx.host.broadcastUpdate(updated);
			ctx.host.broadcastHistoryState();
			break;
		}
		case "duplicateObjects":
			duplicateObjectsOp(msg.objectIds, msg.offsetX, msg.offsetY);
			break;
		case "openSceneSettings": {
			const scene = ctx.host.getScene() ?? parseDocument(ctx.document);
			SceneRegistry.emitSceneSettings(scene);
			break;
		}
		case "undo":
			undoOp();
			break;
		case "redo":
			redoOp();
			break;
	}
}

export async function sendScene(ctx: MessageHandlerContext): Promise<void> {
	const scene = parseDocument(ctx.document);
	ctx.host.setScene(scene);
	ctx.host.resetHistory(scene);

	ctx.webviewPanel.webview.postMessage({ type: "load", scene } satisfies ExtensionToWebviewMessage);

	const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, scene);
	ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	ctx.host.broadcastHistoryState();

	if (ctx.host.isActive()) {
		SceneRegistry.emitSceneChange(scene);
	}
}

export async function sendSceneUpdate(ctx: MessageHandlerContext): Promise<void> {
	if (ctx.getIsProgrammaticChange()) {
		ctx.clearProgrammaticChange();
		return;
	}

	const scene = parseDocument(ctx.document);
	ctx.host.setScene(scene);
	ctx.webviewPanel.webview.postMessage({ type: "load", scene } satisfies ExtensionToWebviewMessage);

	const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, scene);
	ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	if (ctx.host.isActive()) {
		SceneRegistry.emitSceneChange(scene);
	}
}

async function handleSave(msg: { scene: Scene }, ctx: MessageHandlerContext): Promise<void> {
	await writeDocument(ctx.document, msg.scene);
	ctx.host.setScene(msg.scene);
	ctx.markNotDirty();
	if (ctx.host.isActive()) {
		SceneRegistry.emitSceneChange(msg.scene);
	}
}

function handleSceneChanged(msg: { scene: Scene }, ctx: MessageHandlerContext): void {
	ctx.host.setScene(msg.scene);
	ctx.host.markDirty();
	if (ctx.host.isActive()) {
		SceneRegistry.emitSceneChange(msg.scene);
	}
}
