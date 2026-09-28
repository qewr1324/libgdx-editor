import * as vscode from "vscode";
import * as path from "node:path";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { AssetManager } from "../editor/assetManager.js";
import { addSpriteWithTextureOp } from "../editor/scene-ops/addObjectOps.js";

export async function importTextureCommand(context: vscode.ExtensionContext, uriFromContext?: vscode.Uri): Promise<void> {
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
				Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"],
			},
			title: "Select Texture to Import",
		});
		if (!uris || uris.length === 0) return;
		sourceUri = uris[0];
	}

	const ext = path.extname(sourceUri.fsPath).toLowerCase();
	const allowedExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"];
	if (!allowedExts.includes(ext)) {
		vscode.window.showErrorMessage(`Unsupported image format: ${ext}`);
		return;
	}

	const sceneDir = vscode.Uri.joinPath(document.uri, "..");
	const assetsDirName = AssetManager.getAssetsDirName(document.uri);
	const assetsDir = vscode.Uri.joinPath(sceneDir, assetsDirName);
	if (sourceUri.fsPath.startsWith(assetsDir.fsPath)) {
		const relative = path.relative(sceneDir.fsPath, sourceUri.fsPath).replace(/\\/g, "/");
		vscode.window.showInformationMessage(`Texture already in assets: ${relative}`);
		return;
	}

	try {
		const dims = await AssetManager.getImageDimensions(sourceUri);

		let scale = 1.0;
		if (dims) {
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

		const relativePath = await AssetManager.importTexture(document.uri, sourceUri);

		// ✅ از host مستقیم استفاده می‌کنیم
		const added = await addSpriteWithTextureOp(host, relativePath, dims ? Math.round(dims.width * scale) : undefined, dims ? Math.round(dims.height * scale) : undefined);

		if (added) {
			vscode.window.showInformationMessage(`Texture imported: ${relativePath}`);
		} else {
			vscode.window.showInformationMessage(`Texture imported: ${relativePath} (no active viewport)`);
		}
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to import texture: ${err instanceof Error ? err.message : String(err)}`);
	}
}

export async function cleanupAssetsCommand(): Promise<void> {
	const host = SceneEditorProvider.getActiveProvider();
	const scene = host?.getScene();
	const document = host?.getDocument();

	if (!document || !scene) {
		vscode.window.showWarningMessage("No active LibGDX scene.");
		return;
	}

	const confirm = await vscode.window.showWarningMessage("Delete all unused textures in assets/? This cannot be undone.", { modal: true }, "Delete");
	if (confirm !== "Delete") return;

	try {
		await AssetManager.cleanupUnusedAssets(document.uri, scene);
		vscode.window.showInformationMessage("Unused assets cleaned up.");
	} catch (err) {
		vscode.window.showErrorMessage(`Failed to cleanup assets: ${err instanceof Error ? err.message : String(err)}`);
	}
}
