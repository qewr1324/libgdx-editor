import * as vscode from "vscode";
import type { ExtensionToWebviewMessage } from "../../protocol/messages.js";
import { AssetManager } from "../assetManager.js";
import { SceneRegistry } from "../scene-registry.js";
import { addObjectToScene, createObjectAt } from "../scene-mutations.js";
import type { SceneHost } from "../scene-types.js";

export async function addSpriteWithTextureOp(texturePath: string, width?: number, height?: number): Promise<boolean> {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return false;
	const scene = active.getScene();
	const document = active.getDocument();
	if (!scene || !document) return false;

	const defaultX = Math.round(scene.worldSize.width / 2);
	const defaultY = Math.round(scene.worldSize.height / 2);

	const newObj = createObjectAt("sprite", defaultX, defaultY);
	newObj.texture = texturePath;
	newObj.name = `sprite_${newObj.id.slice(-4)}`;

	if (width && height) {
		newObj.transform.width = width;
		newObj.transform.height = height;
	}

	const updated = addObjectToScene(scene, newObj);
	active.setScene(updated);
	active.markDirty();
	active.pushHistory(updated, "add texture");

	const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
	active.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

	active.broadcastUpdate(updated);
	active.broadcastHistoryState();
	return true;
}

export async function importTextureAtOp(x: number, y: number): Promise<void> {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	await doImportTextureOp(active, x, y, false);
}

export async function importTextureDialogOp(): Promise<void> {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	await doImportTextureOp(active, 0, 0, true);
}

async function doImportTextureOp(active: SceneHost | null, x: number, y: number, dialogOnly: boolean): Promise<void> {
	if (!active) return;
	const document = active.getDocument();
	const scene = active.getScene();
	if (!document || !scene) return;

	const uris = await vscode.window.showOpenDialog({
		canSelectMany: false,
		filters: { Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"] },
		title: "Import Texture",
	});
	if (!uris || uris.length === 0) return;

	try {
		const dims = await AssetManager.getImageDimensions(uris[0]);

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

		const relativePath = await AssetManager.importTexture(document.uri, uris[0]);

		if (dialogOnly) {
			vscode.window.showInformationMessage(`Texture imported: ${relativePath}${dims ? ` (${dims.width}×${dims.height})` : ""}`);
			const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, scene);
			active.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
			return;
		}

		const newObj = createObjectAt("sprite", x, y);
		newObj.texture = relativePath;
		newObj.name = `sprite_${newObj.id.slice(-4)}`;

		if (dims) {
			newObj.transform.width = Math.round(dims.width * scale);
			newObj.transform.height = Math.round(dims.height * scale);
		}

		const updated = addObjectToScene(scene, newObj);
		active.setScene(updated);
		active.markDirty();
		active.pushHistory(updated, "import texture");

		const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
		active.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);
		active.broadcastUpdate(updated);
		active.broadcastHistoryState();
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to import texture: ${err instanceof Error ? err.message : String(err)}`);
	}
}
