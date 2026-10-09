import * as vscode from "vscode";
import type { ExtensionToWebviewMessage } from "../../protocol/messages.js";
import { AssetManager } from "../assetManager.js";
import { addObjectToScene, createObjectAt } from "../scene-mutations.js";
import type { SceneHost } from "../scene-types.js";

export async function addSpriteWithTextureOp(host: SceneHost, texturePath: string, width?: number, height?: number): Promise<boolean> {
	const scene = host.getScene();
	const document = host.getDocument();
	if (!scene || !document) return false;

	const defaultX = Math.round(scene.worldSize.width / 2);
	const defaultY = Math.round(scene.worldSize.height / 2);

	const newObj = createObjectAt("sprite", defaultX, defaultY);
	newObj.texture = texturePath;
	newObj.name = `sprite_${newObj.id.slice(-4)}`;

	// 🆕 sprite component رو هم آپدیت کن
	if (newObj.components) {
		newObj.components = newObj.components.map((c) => (c.type === "sprite" ? { ...c, texture: texturePath } : c));
	}

	if (width && height) {
		newObj.transform.width = width;
		newObj.transform.height = height;
	}

	const updated = addObjectToScene(scene, newObj);
	host.getHistory().commit(updated, "add texture");

	const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
	host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	return true;
}

export async function importTextureAtOp(host: SceneHost, x: number, y: number): Promise<void> {
	await doImportTextureOp(host, x, y, false);
}

export async function importTextureDialogOp(host: SceneHost): Promise<void> {
	await doImportTextureOp(host, 0, 0, true);
}

async function doImportTextureOp(host: SceneHost, x: number, y: number, dialogOnly: boolean): Promise<void> {
	const document = host.getDocument();
	const scene = host.getScene();
	if (!document || !scene) return;

	// 🆕 چک کن assets تنظیم شده
	if (!AssetManager.ensureAssetsConfigured()) return;

	// 🆕 فقط از داخل assets انتخاب کن
	const picked = await AssetManager.pickImageFromAssets();
	if (!picked) return;

	try {
		const dims = await AssetManager.getImageDimensions(picked.uri);

		let scale = 1.0;
		if (!dialogOnly && dims) {
			const scaleInput = await vscode.window.showInputBox({
				title: "Import Texture",
				prompt: `Image size: ${dims.width} × ${dims.height}px — Enter scale factor`,
				value: "1.0",
				validateInput: (value) => {
					const num = Number.parseFloat(value);
					if (Number.isNaN(num)) return "Must be a number";
					if (num <= 0) return "Must be greater than 0";
					return null;
				},
			});
			if (scaleInput === undefined) return;
			scale = Number.parseFloat(scaleInput);
			if (Number.isNaN(scale) || scale <= 0) scale = 1.0;
		}

		if (dialogOnly) {
			vscode.window.showInformationMessage(`Texture: ${picked.relativePath}${dims ? ` (${dims.width}×${dims.height})` : ""}`);
			const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
			host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
			return;
		}

		const newObj = createObjectAt("sprite", x, y);
		newObj.texture = picked.relativePath;
		newObj.name = `sprite_${newObj.id.slice(-4)}`;

		// 🆕 sprite component رو هم آپدیت کن
		if (newObj.components) {
			newObj.components = newObj.components.map((c) => (c.type === "sprite" ? { ...c, texture: picked.relativePath } : c));
		}

		if (dims) {
			newObj.transform.width = Math.round(dims.width * scale);
			newObj.transform.height = Math.round(dims.height * scale);
		}

		const updated = addObjectToScene(scene, newObj);
		host.getHistory().commit(updated, "import texture");

		const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
		host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to import texture: ${err instanceof Error ? err.message : String(err)}`);
	}
}
