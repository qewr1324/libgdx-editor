// src/commands/importAtlas.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { AssetManager } from "../editor/assetManager.js";
import { addObjectToScene, createEmptyGameObject, getNextZIndex } from "../editor/scene-mutations.js";
import { normalizeAtlasProperties, type AtlasProperties } from "../features/texture-atlas/atlas-properties.js";
import { AtlasImporter } from "../features/texture-atlas/atlas-importer.js";
import type { ExtensionToWebviewMessage } from "../protocol/messages.js";
import { log } from "../shared/logger.js";

/**
 * Command: import یه atlas (PNG [+ .atlas کنارش]) و ساخت آبجکت Atlas.
 *
 * اگه uriFromContext بده، از همون استفاده می‌کنه.
 * وگرنه فایل picker باز می‌کنه.
 */
export async function importAtlasCommand(context: vscode.ExtensionContext, uriFromContext?: vscode.Uri): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	if (!host) {
		vscode.window.showWarningMessage("No active LibGDX scene. Open or create a .lgdx.json file first.");
		return;
	}
	const document = host.getDocument();
	const scene = host.getScene();
	if (!document || !scene) {
		vscode.window.showWarningMessage("Could not read current scene.");
		return;
	}

	let sourceUri: vscode.Uri | undefined = uriFromContext;

	if (!sourceUri) {
		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp"],
				"Atlas Files": ["atlas"],
			},
			title: "Select Atlas Texture",
		});
		if (!uris || uris.length === 0) return;
		sourceUri = uris[0];
	}

	// ---------- validation ----------
	const ext = path.extname(sourceUri.fsPath).toLowerCase();

	// اگه کاربر خود .atlas انتخاب کرده، بذار کنارش .png رو پیدا کنیم
	if (ext === ".atlas") {
		const png = sourceUri.fsPath.replace(/\.atlas$/i, ".png");
		const pngUri = vscode.Uri.file(png);
		try {
			await vscode.workspace.fs.stat(pngUri);
			sourceUri = pngUri;
		} catch {
			vscode.window.showErrorMessage(`Could not find matching PNG: ${path.basename(png)}`);
			return;
		}
	}

	const imageExt = path.extname(sourceUri.fsPath).toLowerCase();
	const allowedExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
	if (!allowedExts.includes(imageExt)) {
		vscode.window.showErrorMessage(`Unsupported image format: ${imageExt}. Use PNG/JPG/etc.`);
		return;
	}

	try {
		// ---------- import texture + atlas ----------
		const { texturePath, atlas } = await AtlasImporter.importAtlas(document.uri, sourceUri);

		const dims = await AssetManager.getImageDimensions(vscode.Uri.joinPath(document.uri, "..", texturePath));

		// ---------- pick default region ----------
		const defaultProps: Partial<AtlasProperties> = {
			texture: texturePath,
			atlasPath: atlas?.atlasPath ?? "",
			tint: "#ffffff",
			mode: atlas && atlas.regions.length > 0 ? "single" : "grid",
		};

		if (atlas && atlas.regions.length > 0) {
			defaultProps.region = atlas.regions[0].name;
		} else {
			defaultProps.gridCols = 1;
			defaultProps.gridRows = 1;
		}

		const atlasProps = normalizeAtlasProperties(defaultProps);

		// ---------- create object ----------
		const defaultX = Math.round(scene.worldSize.width / 2);
		const defaultY = Math.round(scene.worldSize.height / 2);

		const newObj = createEmptyGameObject(defaultX, defaultY);
		newObj.name = `atlas_${newObj.id.slice(-4)}`;
		newObj.zIndex = getNextZIndex(scene);

		// ابعاد: از region اول یا از تصویر
		if (atlas && atlas.regions.length > 0) {
			const r = atlas.regions[0];
			newObj.transform.width = r.width;
			newObj.transform.height = r.height;
		} else if (dims) {
			newObj.transform.width = dims.width;
			newObj.transform.height = dims.height;
		}

		newObj.properties.atlas = atlasProps;

		const updated = addObjectToScene(scene, newObj);
		host.getHistory().commit(updated, "add atlas");

		// ---------- load textures to webview ----------
		const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
		host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

		// ---------- atlas regions (اگه داشت) ----------
		if (atlas) {
			host.postToWebview({
				type: "atlasRegionsLoaded",
				texturePath: atlas.texturePath,
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
		}

		// ---------- select آبجکت جدید ----------
		setTimeout(() => {
			host.postToWebview({ type: "selectObjects", objectIds: [newObj.id] } satisfies ExtensionToWebviewMessage);
		}, 100);

		if (atlas) {
			vscode.window.showInformationMessage(`Atlas imported: ${texturePath} (${atlas.regions.length} regions)`);
		} else {
			vscode.window.showInformationMessage(`Texture imported as atlas: ${texturePath} (no .atlas file found)`);
		}
	} catch (err) {
		log.error("[importAtlas] failed:", err);
		vscode.window.showErrorMessage(`Failed to import atlas: ${err instanceof Error ? err.message : String(err)}`);
	}
}
