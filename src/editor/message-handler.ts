// src/editor/message-handler.ts
import type * as vscode from "vscode";
import type { ExtensionToWebviewMessage, WebviewToExtensionMessage } from "../protocol/messages.js";
import { toConfigMessage } from "../protocol/messages.js";
import type { GameObject, Scene } from "../types/scene.js";
import type { Component } from "../types/components.js";
import { createComponentId, createDefaultComponent } from "../types/components.js";
import { AssetManager } from "./assetManager.js";
import { ConfigManager } from "../config/config-manager.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { SceneRegistry } from "./scene-registry.js";
import { parseDocument, writeDocument, saveDocument } from "./scene-parser.js";
import {
	addObjectToScene,
	bringForwardInScene,
	bringToFrontInScene,
	createEmptyGameObject,
	createObjectAt,
	createShapeAt,
	deleteObjectFromScene,
	getNextZIndex,
	sendBackwardInScene,
	sendToBackInScene,
	setObjectZIndexInScene,
	updateObjectsInScene,
	addComponentToObjectInScene,
	updateComponentInScene,
	removeComponentFromScene,
} from "./scene-mutations.js";
import { ClipboardStore } from "./clipboardStore.js";
import { importTextureAtOp, importTextureDialogOp } from "./scene-ops/addObjectOps.js";
import { deleteObjectOp, duplicateObjectsOp, updateObjectOp } from "./scene-ops/objectOps.js";
import { updateSceneFieldOp } from "./scene-ops/sceneFieldOps.js";
import { undoOp, redoOp } from "./scene-ops/historyOps.js";
import { AtlasImporter } from "../features/texture-atlas/atlas-importer.js";
import type { SceneHost } from "./scene-types.js";
import { log } from "../shared/logger.js";

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
			newObj.zIndex = getNextZIndex(scene);
			const updated = addObjectToScene(scene, newObj);
			host.getHistory().commit(updated, `add ${msg.objectType}`);
			break;
		}
		case "requestAddShape": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createShapeAt(msg.shapeType, msg.x, msg.y);
			newObj.zIndex = getNextZIndex(scene);
			const updated = addObjectToScene(scene, newObj);
			host.getHistory().commit(updated, `add ${msg.shapeType}`);

			await config.update({ ui: { lastShapeType: msg.shapeType } });
			break;
		}
		case "requestAddEmptyObject": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createEmptyGameObject(msg.x, msg.y);
			newObj.zIndex = getNextZIndex(scene);
			const updated = addObjectToScene(scene, newObj);
			host.getHistory().commit(updated, "add empty object");

			setTimeout(() => {
				host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage);
			}, 50);
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
			host.getHistory().commit(updated, msg.historyLabel ?? "update objects");
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
			host.getHistory().commit(updated, "delete objects");
			break;
		}
		case "copyObjects": {
			const current = host.getScene();
			if (!current) break;
			const items: GameObject[] = [];
			for (const layer of current.layers) {
				for (const obj of layer.objects) {
					if (msg.objectIds.includes(obj.id)) {
						items.push(structuredClone(obj) as GameObject);
					}
				}
			}
			ClipboardStore.set(items, current.name);
			host.postToWebview({ type: "clipboardChanged", count: items.length } satisfies ExtensionToWebviewMessage);
			log.debug(`[message-handler] copy ${items.length} objects`);
			break;
		}
		case "cutObjects": {
			const current = host.getScene();
			if (!current) break;
			const items: GameObject[] = [];
			for (const layer of current.layers) {
				for (const obj of layer.objects) {
					if (msg.objectIds.includes(obj.id)) {
						items.push(structuredClone(obj) as GameObject);
					}
				}
			}
			ClipboardStore.set(items, current.name);
			host.postToWebview({ type: "clipboardChanged", count: items.length } satisfies ExtensionToWebviewMessage);

			let updated = current;
			for (const id of msg.objectIds) {
				updated = deleteObjectFromScene(updated, id);
			}
			host.getHistory().commit(updated, "cut");
			break;
		}
		case "pasteObjects": {
			const current = host.getScene();
			if (!current) break;
			if (ClipboardStore.isEmpty()) break;

			const pasted = msg.pasteInPlace ? ClipboardStore.getPasteInPlace() : ClipboardStore.getNextPaste();

			for (const obj of pasted) {
				if (obj.components) {
					obj.components = obj.components.map((c) => ({ ...c, id: createComponentId() }));
				}
			}

			let updated = current;
			for (const obj of pasted) {
				obj.zIndex = getNextZIndex(updated);
				updated = addObjectToScene(updated, obj);
			}
			host.getHistory().commit(updated, "paste");

			const newIds = pasted.map((o) => o.id);
			host.postToWebview({ type: "selectObjects", objectIds: newIds } satisfies ExtensionToWebviewMessage);

			log.debug(`[message-handler] pasted ${pasted.length} objects (inPlace=${!!msg.pasteInPlace})`);
			break;
		}
		case "duplicateObjects":
			duplicateObjectsOp(host, msg.objectIds, msg.offsetX, msg.offsetY);
			break;
		case "setObjectZIndex": {
			const current = host.getScene();
			if (!current) break;
			const updated = setObjectZIndexInScene(current, msg.objectId, msg.zIndex);
			host.getHistory().commit(updated, "set z-index");
			break;
		}
		case "bringForward": {
			const current = host.getScene();
			if (!current) break;
			const updated = bringForwardInScene(current, msg.objectId);
			if (updated !== current) {
				host.getHistory().commit(updated, "bring forward");
			}
			break;
		}
		case "sendBackward": {
			const current = host.getScene();
			if (!current) break;
			const updated = sendBackwardInScene(current, msg.objectId);
			if (updated !== current) {
				host.getHistory().commit(updated, "send backward");
			}
			break;
		}
		case "bringToFront": {
			const current = host.getScene();
			if (!current) break;
			const updated = bringToFrontInScene(current, msg.objectId);
			host.getHistory().commit(updated, "bring to front");
			break;
		}
		case "sendToBack": {
			const current = host.getScene();
			if (!current) break;
			const updated = sendToBackInScene(current, msg.objectId);
			host.getHistory().commit(updated, "send to back");
			break;
		}
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
			await config.update(msg.partial as never);

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
		case "requestAtlasRegions": {
			const scene = host.getScene();
			if (!scene) break;

			try {
				const atlas = await AtlasImporter.loadAtlasRegions(ctx.document.uri, msg.texturePath);
				if (atlas) {
					ctx.webviewPanel.webview.postMessage({
						type: "atlasRegionsLoaded",
						texturePath: msg.texturePath,
						atlasPath: atlas.atlasPath,
						regions: atlas.regions.map((r) => ({
							name: r.name,
							x: r.x,
							y: r.y,
							width: r.width,
							height: r.height,
							rotate: r.rotate,
							index: r.index,
						})),
					} satisfies ExtensionToWebviewMessage);
				} else {
					ctx.webviewPanel.webview.postMessage({
						type: "atlasNotFound",
						texturePath: msg.texturePath,
					} satisfies ExtensionToWebviewMessage);
				}
			} catch (err) {
				log.error("[message-handler] requestAtlasRegions failed:", err);
				ctx.webviewPanel.webview.postMessage({
					type: "atlasNotFound",
					texturePath: msg.texturePath,
				} satisfies ExtensionToWebviewMessage);
			}
			break;
		}
	}
}

export function handleAddComponent(host: SceneHost, objectId: string, componentType: Component["type"]): void {
	const scene = host.getScene();
	if (!scene) return;

	const newComponent = createDefaultComponent(componentType);
	const updated = addComponentToObjectInScene(scene, objectId, newComponent);
	host.getHistory().commit(updated, `add ${componentType} component`);
}

export function handleUpdateComponent(host: SceneHost, objectId: string, componentId: string, updates: Partial<Component>): void {
	const scene = host.getScene();
	if (!scene) return;

	const updated = updateComponentInScene(scene, objectId, componentId, updates);
	host.getHistory().commit(updated, "update component");
}

export function handleRemoveComponent(host: SceneHost, objectId: string, componentId: string): void {
	const scene = host.getScene();
	if (!scene) return;

	const updated = removeComponentFromScene(scene, objectId, componentId);
	host.getHistory().commit(updated, "remove component");
}

export function handleReplaceComponent(host: SceneHost, objectId: string, component: Component): void {
	const scene = host.getScene();
	if (!scene) return;

	const updated = addComponentToObjectInScene(scene, objectId, component);
	host.getHistory().commit(updated, "update component");
}

export async function sendScene(ctx: MessageHandlerContext): Promise<void> {
	const host = ctx.host;
	const scene = parseDocument(ctx.document);
	host.setScene(scene);
	host.getHistory().reset(scene);

	ctx.webviewPanel.webview.postMessage({ type: "load", scene } satisfies ExtensionToWebviewMessage);

	const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, scene);
	ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	const broken = await AssetManager.findBrokenAssets(ctx.document.uri, scene);
	ctx.webviewPanel.webview.postMessage({ type: "brokenAssets", paths: broken } satisfies ExtensionToWebviewMessage);

	const config = ConfigManager.getInstance().get();
	ctx.webviewPanel.webview.postMessage({
		type: "configLoaded",
		config: toConfigMessage(config),
	} satisfies ExtensionToWebviewMessage);

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

	const broken = await AssetManager.findBrokenAssets(ctx.document.uri, fileScene);
	ctx.webviewPanel.webview.postMessage({ type: "brokenAssets", paths: broken } satisfies ExtensionToWebviewMessage);

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

		ctx.host.broadcastHistoryState();

		if (ctx.host.isActive()) {
			SceneRegistry.emitSceneChange(ctx.host, msg.scene);
		}
	} catch (err) {
		log.error("[handleSave] failed:", err);
	}
}
