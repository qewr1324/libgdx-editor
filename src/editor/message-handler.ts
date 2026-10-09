// src/editor/message-handler.ts
import * as vscode from "vscode";
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
	updateAtlasPropertiesInScene,
	updateReferenceImageInScene,
	updateReferenceImageTransformInScene,
	removeReferenceImageFromScene,
	toggleReferenceImageHiddenInScene,
	toggleReferenceImageLockInScene,
	addSafeAreaToScene,
	updateSafeAreaInScene,
	removeSafeAreaFromScene,
	toggleSafeAreaVisibleInScene,
} from "./scene-mutations.js";
import { addGuideToScene, moveGuideInScene, removeGuideFromScene, clearGuidesInScene, toggleGuidesVisibilityInScene, toggleGuideLockInScene } from "./guide-mutations.js";
import { ClipboardStore } from "./clipboardStore.js";
import { importTextureAtOp, importTextureDialogOp } from "./scene-ops/addObjectOps.js";
import { deleteObjectOp, duplicateObjectsOp, updateObjectOp } from "./scene-ops/objectOps.js";
import { updateSceneFieldOp } from "./scene-ops/sceneFieldOps.js";
import { undoOp, redoOp } from "./scene-ops/historyOps.js";
import { AtlasImporter } from "../features/texture-atlas/atlas-importer.js";
import { normalizeAtlasProperties } from "../features/texture-atlas/atlas-properties.js";
import { scheduleCleanup, cancelCleanup } from "./deferred-cleanup.js";
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
		case "save": {
			const current = host.getScene();
			if (!current) break;
			cancelCleanup(ctx.document.uri);
			await handleSave({ scene: current }, ctx);
			break;
		}
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
			setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 50);
			break;
		}
		case "requestAddSprite": {
			const scene = host.getScene();
			if (!scene) break;
			if (!AssetManager.ensureAssetsConfigured()) break;

			const picked = await AssetManager.pickImageFromAssets(ctx.document.uri);
			if (!picked) break;

			try {
				const dims = await AssetManager.getImageDimensions(picked.uri);

				const newObj = createObjectAt("sprite", msg.x, msg.y);
				newObj.name = `sprite_${newObj.id.slice(-4)}`;
				newObj.zIndex = getNextZIndex(scene);
				newObj.texture = picked.relativePath;

				if (newObj.components) {
					newObj.components = newObj.components.map((c) => (c.type === "sprite" ? { ...c, texture: picked.relativePath } : c));
				}

				if (dims) {
					newObj.transform.width = dims.width;
					newObj.transform.height = dims.height;
				}

				const updated = addObjectToScene(scene, newObj);
				host.getHistory().commit(updated, "add sprite");

				const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, updated);
				host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

				setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 100);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to add sprite: ${err instanceof Error ? err.message : String(err)}`);
			}
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
			setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 50);
			break;
		}
		case "requestAddEmptyObject": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createEmptyGameObject(msg.x, msg.y);
			newObj.zIndex = getNextZIndex(scene);
			const updated = addObjectToScene(scene, newObj);
			host.getHistory().commit(updated, "add empty object");
			setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 50);
			break;
		}
		case "requestAddText": {
			const scene = host.getScene();
			if (!scene) break;
			const newObj = createObjectAt("text", msg.x, msg.y);
			newObj.zIndex = getNextZIndex(scene);
			const updated = addObjectToScene(scene, newObj);
			host.getHistory().commit(updated, "add text");
			setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 50);
			break;
		}
		case "requestAddAtlas": {
			const scene = host.getScene();
			if (!scene) break;
			if (!AssetManager.ensureAssetsConfigured()) break;

			const picked = await AssetManager.pickImageFromAssets(ctx.document.uri);
			if (!picked) break;

			const sourceUri = picked.uri;

			try {
				const { texturePath, atlas } = await AtlasImporter.importAtlas(sourceUri, ctx.document.uri);

				const newObj = createEmptyGameObject(msg.x, msg.y);
				newObj.name = `atlas_${newObj.id.slice(-4)}`;
				newObj.zIndex = getNextZIndex(scene);

				const defaultProps = normalizeAtlasProperties({
					texture: texturePath,
					atlasPath: atlas?.atlasPath ?? "",
					tint: "#ffffff",
					mode: atlas && atlas.regions.length > 0 ? "single" : "grid",
					region: atlas && atlas.regions.length > 0 ? atlas.regions[0].name : undefined,
					gridCols: 1,
					gridRows: 1,
				});

				if (atlas && atlas.regions.length > 0) {
					const r = atlas.regions[0];
					newObj.transform.width = r.width;
					newObj.transform.height = r.height;
				}

				newObj.properties.atlas = defaultProps;

				const updated = addObjectToScene(scene, newObj);
				host.getHistory().commit(updated, "add atlas");

				const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, updated);
				host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

				if (atlas) {
					host.postToWebview({
						type: "atlasRegionsLoaded",
						texturePath: atlas.texturePath,
						atlasPath: atlas.atlasPath,
						regions: atlas.regions.map((r) => ({ name: r.name, x: r.x, y: r.y, width: r.width, height: r.height, rotate: r.rotate, index: r.index })),
					} satisfies ExtensionToWebviewMessage);
				}

				setTimeout(() => host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage), 100);
			} catch (err) {
				vscode.window.showErrorMessage(`Failed to add atlas: ${err instanceof Error ? err.message : String(err)}`);
			}
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
		case "updateAtlasProperties": {
			const current = host.getScene();
			if (!current) break;
			const updated = updateAtlasPropertiesInScene(current, msg.objectId, msg.properties);
			host.getHistory().commit(updated, "update atlas");
			break;
		}
		case "deleteObject":
			deleteObjectOp(host, msg.objectId);
			break;
		case "deleteObjects": {
			const current = host.getScene();
			if (!current) break;
			let updated = current;
			for (const id of msg.objectIds) updated = deleteObjectFromScene(updated, id);
			host.getHistory().commit(updated, "delete objects");
			break;
		}
		case "copyObjects": {
			const current = host.getScene();
			if (!current) break;
			const items: GameObject[] = [];
			for (const layer of current.layers) {
				for (const obj of layer.objects) {
					if (msg.objectIds.includes(obj.id)) items.push(structuredClone(obj) as GameObject);
				}
			}
			const docUri = ctx.document.uri.toString();
			ClipboardStore.set(items, current.name, docUri);
			host.postToWebview({ type: "clipboardChanged", count: items.length } satisfies ExtensionToWebviewMessage);
			break;
		}
		case "cutObjects": {
			const current = host.getScene();
			if (!current) break;
			const items: GameObject[] = [];
			for (const layer of current.layers) {
				for (const obj of layer.objects) {
					if (msg.objectIds.includes(obj.id)) items.push(structuredClone(obj) as GameObject);
				}
			}
			const docUri = ctx.document.uri.toString();
			ClipboardStore.set(items, current.name, docUri);
			host.postToWebview({ type: "clipboardChanged", count: items.length } satisfies ExtensionToWebviewMessage);
			let updated = current;
			for (const id of msg.objectIds) updated = deleteObjectFromScene(updated, id);
			host.getHistory().commit(updated, "cut");
			break;
		}
		case "pasteObjects": {
			let current = host.getScene();
			if (!current) {
				current = parseDocument(ctx.document);
				host.setScene(current);
				host.getHistory().reset(current);
			}
			if (ClipboardStore.isEmpty()) break;

			const sourceUriStr = ClipboardStore.getSourceDocumentUri();
			const sourceUri = sourceUriStr ? vscode.Uri.parse(sourceUriStr) : null;
			const targetUriStr = ctx.document.uri.toString();
			const isCrossScene = sourceUri !== null && sourceUri.toString() !== targetUriStr;

			const pasted = msg.pasteInPlace ? ClipboardStore.getPasteInPlace() : ClipboardStore.getNextPaste();
			const texturePathMap = new Map<string, string>();

			if (isCrossScene) {
				for (const obj of pasted) {
					if (obj.components) {
						for (const comp of obj.components) {
							const texturePath = (comp as { texture?: string }).texture;
							if (texturePath && !texturePathMap.has(texturePath)) {
								texturePathMap.set(texturePath, texturePath);
							}
						}
					}
				}
			}

			for (const obj of pasted) {
				if (obj.components) {
					obj.components = obj.components.map((c) => {
						const component = { ...c, id: createComponentId() } as Component & { texture?: string };
						if (component.texture && texturePathMap.has(component.texture)) {
							component.texture = texturePathMap.get(component.texture);
						}
						return component;
					});
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
			const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, updated);
			host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
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
			if (updated !== current) host.getHistory().commit(updated, "bring forward");
			break;
		}
		case "sendBackward": {
			const current = host.getScene();
			if (!current) break;
			const updated = sendBackwardInScene(current, msg.objectId);
			if (updated !== current) host.getHistory().commit(updated, "send backward");
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
		case "undo": {
			cancelCleanup(ctx.document.uri);
			undoOp(host);
			break;
		}
		case "redo": {
			cancelCleanup(ctx.document.uri);
			redoOp(host);
			break;
		}
		case "updateConfig":
			await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
			break;
		case "pickAssetsFolder":
			await handlePickAssetsFolder(host);
			break;
		case "requestSpriteTextureChange":
			await handleSpriteTextureChange(host, msg.objectId);
			break;
		case "requestAtlasTextureChange":
			await handleAtlasTextureChange(host, msg.objectId);
			break;
		case "addComponent":
			handleAddComponent(host, msg.objectId, msg.componentType);
			break;
		case "updateComponent":
			handleUpdateComponent(host, msg.objectId, msg.componentId, msg.updates);
			break;
		case "removeComponent":
			handleRemoveComponent(host, msg.objectId, msg.componentId);
			break;
		case "replaceComponent":
			handleReplaceComponent(host, msg.objectId, msg.component);
			break;
		case "addGuide": {
			const current = host.getScene();
			if (!current) break;
			const updated = addGuideToScene(current, msg.axis, msg.position, msg.color);
			host.getHistory().commit(updated, "add guide");
			break;
		}
		case "moveGuide": {
			const current = host.getScene();
			if (!current) break;
			const updated = moveGuideInScene(current, msg.guideId, msg.position);
			host.getHistory().commit(updated, "move guide");
			break;
		}
		case "removeGuide": {
			const current = host.getScene();
			if (!current) break;
			const updated = removeGuideFromScene(current, msg.guideId);
			host.getHistory().commit(updated, "remove guide");
			break;
		}
		case "clearGuides": {
			const current = host.getScene();
			if (!current) break;
			const updated = clearGuidesInScene(current);
			host.getHistory().commit(updated, "clear guides");
			break;
		}
		case "toggleGuidesVisibility": {
			const current = host.getScene();
			if (!current) break;
			const updated = toggleGuidesVisibilityInScene(current);
			host.getHistory().commit(updated, "toggle guides");
			break;
		}
		case "toggleGuideLock": {
			const current = host.getScene();
			if (!current) break;
			const updated = toggleGuideLockInScene(current, msg.guideId);
			host.getHistory().commit(updated, "toggle guide lock");
			break;
		}
		case "openImportReference": {
			await vscode.commands.executeCommand("libgdx-editor.importReference");
			break;
		}
		case "updateReferenceImage": {
			const current = host.getScene();
			if (!current) break;
			const updated = updateReferenceImageInScene(current, msg.updates);
			host.getHistory().commit(updated, "update reference");
			break;
		}
		case "updateReferenceTransform": {
			const current = host.getScene();
			if (!current) break;
			const updated = updateReferenceImageTransformInScene(current, msg.transform);
			host.getHistory().commit(updated, "move reference");
			break;
		}
		case "removeReferenceImage": {
			const current = host.getScene();
			if (!current) break;
			const updated = removeReferenceImageFromScene(current);
			host.getHistory().commit(updated, "remove reference");
			scheduleCleanup(ctx.document.uri, updated, 5000);
			break;
		}
		case "toggleReferenceHidden": {
			const current = host.getScene();
			if (!current) break;
			const updated = toggleReferenceImageHiddenInScene(current);
			host.getHistory().commit(updated, "toggle reference visibility");
			break;
		}
		case "toggleReferenceLock": {
			const current = host.getScene();
			if (!current) break;
			const updated = toggleReferenceImageLockInScene(current);
			host.getHistory().commit(updated, "toggle reference lock");
			break;
		}
		case "addSafeArea": {
			const current = host.getScene();
			if (!current) break;
			const updated = addSafeAreaToScene(current);
			host.getHistory().commit(updated, "add safe area");
			break;
		}
		case "updateSafeArea": {
			const current = host.getScene();
			if (!current) break;
			const updated = updateSafeAreaInScene(current, msg.updates);
			host.getHistory().commit(updated, "update safe area");
			break;
		}
		case "removeSafeArea": {
			const current = host.getScene();
			if (!current) break;
			const updated = removeSafeAreaFromScene(current);
			host.getHistory().commit(updated, "remove safe area");
			break;
		}
		case "toggleSafeAreaVisible": {
			const current = host.getScene();
			if (!current) break;
			const updated = toggleSafeAreaVisibleInScene(current);
			host.getHistory().commit(updated, "toggle safe area");
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
						regions: atlas.regions.map((r) => ({ name: r.name, x: r.x, y: r.y, width: r.width, height: r.height, rotate: r.rotate, index: r.index })),
					} satisfies ExtensionToWebviewMessage);
				} else {
					ctx.webviewPanel.webview.postMessage({ type: "atlasNotFound", texturePath: msg.texturePath } satisfies ExtensionToWebviewMessage);
				}
			} catch (err) {
				log.error("[message-handler] requestAtlasRegions failed:", err);
				ctx.webviewPanel.webview.postMessage({ type: "atlasNotFound", texturePath: msg.texturePath } satisfies ExtensionToWebviewMessage);
			}
			break;
		}
	}
}

// ============================================================
// Asset handlers
// ============================================================

async function handlePickAssetsFolder(host: SceneHost): Promise<void> {
	const document = host.getDocument();
	const picked = await AssetManager.pickAssetsFolder(document.uri);
	if (!picked) return;

	const config = ConfigManager.getInstance();
	await config.set("assetsPath", picked);

	const scene = host.getScene();
	if (scene) {
		const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
		host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
		const broken = await AssetManager.findBrokenAssets(document.uri, scene);
		host.postToWebview({ type: "brokenAssets", paths: broken } satisfies ExtensionToWebviewMessage);
	}

	vscode.window.showInformationMessage(`Assets folder set to: ${picked}`);
}

async function handleSpriteTextureChange(host: SceneHost, objectId: string): Promise<void> {
	if (!AssetManager.ensureAssetsConfigured()) return;

	const document = host.getDocument();
	const picked = await AssetManager.pickImageFromAssets(document.uri);
	if (!picked) return;

	const scene = host.getScene();
	if (!scene) return;

	const newScene = structuredClone(scene) as Scene;
	let found = false;

	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (!obj) continue;

		obj.texture = picked.relativePath;

		if (obj.components) {
			obj.components = obj.components.map((c) => (c.type === "sprite" ? { ...c, texture: picked.relativePath } : c));
		}

		const dims = await AssetManager.getImageDimensions(picked.uri);
		if (dims) {
			obj.transform.width = dims.width;
			obj.transform.height = dims.height;
		}

		found = true;
		break;
	}

	if (!found) {
		vscode.window.showWarningMessage("Object not found.");
		return;
	}

	host.getHistory().commit(newScene, "change sprite texture");

	const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, newScene);
	host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	vscode.window.showInformationMessage(`Texture changed to: ${picked.relativePath}`);
}

async function handleAtlasTextureChange(host: SceneHost, objectId: string): Promise<void> {
	if (!AssetManager.ensureAssetsConfigured()) return;

	const document = host.getDocument();
	const picked = await AssetManager.pickImageFromAssets(document.uri);
	if (!picked) return;

	const scene = host.getScene();
	if (!scene) return;

	const result = await AtlasImporter.importAtlas(picked.uri, document.uri);

	const newScene = structuredClone(scene) as Scene;
	let found = false;

	for (const layer of newScene.layers) {
		const obj = layer.objects.find((o) => o.id === objectId);
		if (!obj) continue;

		const existingAtlas = (obj.properties?.atlas as Record<string, unknown> | undefined) ?? {};
		obj.properties.atlas = normalizeAtlasProperties({
			...existingAtlas,
			texture: result.texturePath,
			atlasPath: result.atlas?.atlasPath ?? "",
			mode: result.atlas && result.atlas.regions.length > 0 ? "single" : "grid",
			region: result.atlas && result.atlas.regions.length > 0 ? result.atlas.regions[0].name : undefined,
		} as never);

		if (result.atlas && result.atlas.regions.length > 0) {
			const r = result.atlas.regions[0];
			obj.transform.width = r.width;
			obj.transform.height = r.height;
		} else {
			const dims = await AssetManager.getImageDimensions(picked.uri);
			if (dims) {
				obj.transform.width = dims.width;
				obj.transform.height = dims.height;
			}
		}

		found = true;
		break;
	}

	if (!found) {
		vscode.window.showWarningMessage("Object not found.");
		return;
	}

	host.getHistory().commit(newScene, "change atlas texture");

	const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, newScene);
	host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	if (result.atlas) {
		host.postToWebview({
			type: "atlasRegionsLoaded",
			texturePath: result.atlas.texturePath,
			atlasPath: result.atlas.atlasPath,
			regions: result.atlas.regions.map((r) => ({ name: r.name, x: r.x, y: r.y, width: r.width, height: r.height, rotate: r.rotate, index: r.index })),
		} satisfies ExtensionToWebviewMessage);
	}

	vscode.window.showInformationMessage(`Atlas texture changed to: ${picked.relativePath}`);
}

// ============================================================
// Component Operations
// ============================================================

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

// ============================================================
// Scene Send
// ============================================================

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
	ctx.webviewPanel.webview.postMessage({ type: "configLoaded", config: toConfigMessage(config) } satisfies ExtensionToWebviewMessage);

	if (host.isActive()) SceneRegistry.emitSceneChange(host, scene);
}

/**
 * 🆕 وقتی فایل از بیرون عوض شد، scene رو دوباره بخون.
 * ولی اگه host تغییرات ذخیره‌نشده داره، نادیده بگیر.
 */
export async function sendSceneUpdate(ctx: MessageHandlerContext): Promise<void> {
	if (ctx.getIsProgrammaticChange()) return;

	const host = ctx.host;

	// 🆕 اگه تغییرات ذخیره‌نشده داره، فایل رو نادیده بگیر
	// (چون کاربر داره توی webview کار می‌کنه و host.scene منبع حقیقته)
	if (host.isDirty) {
		log.debug("[sendSceneUpdate] host is dirty, skipping file reload");
		return;
	}

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
	if (host.isActive()) SceneRegistry.emitSceneChange(host, fileScene);
}

/**
 * 🆕 ذخیره‌ی امن:
 * - programmaticChange رو طولانی‌تر می‌کنه
 * - از host.scene استفاده می‌کنه (نه msg.scene)
 * - بعد از ذخیره، دوباره به webview می‌فرسته (تا مطمئن بشه sync هست)
 */
async function handleSave(msg: { scene: Scene }, ctx: MessageHandlerContext): Promise<void> {
	// 🆕 programmaticChange رو برای ۲ ثانیه فعال کن (کافیه برای write + save)
	ctx.setProgrammaticChange(true);
	ctx.host.markProgrammaticChange(2000);

	try {
		// 🆕 از host.scene استفاده کن (که آخرین تغییرات رو داره)
		const sceneToSave = ctx.host.getScene() ?? msg.scene;
		ctx.host.setScene(sceneToSave);

		await writeDocument(ctx.document, sceneToSave);
		await saveDocument(ctx.document);
		ctx.markNotDirty();

		// 🆕 بعد از ذخیره، دوباره scene رو به webview بفرست
		// (تا مطمئن بشیم webview با host sync هست)
		ctx.webviewPanel.webview.postMessage({ type: "load", scene: sceneToSave } satisfies ExtensionToWebviewMessage);
		const textures = await AssetManager.loadTexturesAsDataUrls(ctx.document.uri, sceneToSave);
		ctx.webviewPanel.webview.postMessage({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
		const broken = await AssetManager.findBrokenAssets(ctx.document.uri, sceneToSave);
		ctx.webviewPanel.webview.postMessage({ type: "brokenAssets", paths: broken } satisfies ExtensionToWebviewMessage);

		ctx.host.broadcastHistoryState();
		if (ctx.host.isActive()) SceneRegistry.emitSceneChange(ctx.host, sceneToSave);
	} catch (err) {
		log.error("[handleSave] failed:", err);
	}
}
