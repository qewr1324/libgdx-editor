// src/commands/assetCommands.ts
import * as vscode from "vscode";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { AssetManager } from "../editor/assetManager.js";
import { ConfigManager } from "../config/config-manager.js";
import { AtlasImporter } from "../features/texture-atlas/atlas-importer.js";
import { normalizeAtlasProperties } from "../features/texture-atlas/atlas-properties.js";
import type { ExtensionToWebviewMessage } from "../protocol/messages.js";
import type { Scene } from "../types/scene.js";

/**
 * 🆕 انتخاب پوشه‌ی assets توسط کاربر.
 * نسبت به پوشه‌ی صحنه‌ی فعلی محاسبه می‌شه.
 */
export async function pickAssetsFolderCommand(): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	const sceneUri = host?.getDocument()?.uri;

	const picked = await AssetManager.pickAssetsFolder(sceneUri);
	if (!picked) return;

	const config = ConfigManager.getInstance();
	await config.set("assetsPath", picked);

	if (host) {
		const document = host.getDocument();
		const scene = host.getScene();
		if (scene) {
			const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
			host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
			const broken = await AssetManager.findBrokenAssets(document.uri, scene);
			host.postToWebview({ type: "brokenAssets", paths: broken } satisfies ExtensionToWebviewMessage);
		}
	}

	vscode.window.showInformationMessage(`Assets folder set to: ${picked}`);
}

/**
 * 🆕 تغییر texture یه sprite.
 */
export async function changeSpriteTextureCommand(objectId: string): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	if (!host) return;

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

/**
 * 🆕 تغییر texture یه atlas.
 */
export async function changeAtlasTextureCommand(objectId: string): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	if (!host) return;

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
