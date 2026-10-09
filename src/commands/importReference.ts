// src/commands/importReference.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { SceneEditorProvider } from "../editor/SceneEditorProvider.js";
import { AssetManager } from "../editor/assetManager.js";
import { addReferenceImageToScene } from "../editor/scene-mutations.js";
import type { ExtensionToWebviewMessage } from "../protocol/messages.js";
import { log } from "../shared/logger.js";

export async function importReferenceCommand(context: vscode.ExtensionContext, uriFromContext?: vscode.Uri): Promise<void> {
	void context;
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

	// 🆕 چک کن assets تنظیم شده
	if (!AssetManager.ensureAssetsConfigured()) return;

	if (scene.referenceImage) {
		const choice = await vscode.window.showWarningMessage("Scene already has a reference image. Replace it?", { modal: true }, "Replace", "Cancel");
		if (choice !== "Replace") return;
	}

	let sourceUri: vscode.Uri | undefined = uriFromContext;

	if (!sourceUri) {
		// 🆕 فقط از داخل assets
		const picked = await AssetManager.pickImageFromAssets();
		if (!picked) return;
		sourceUri = picked.uri;
	}

	const ext = path.extname(sourceUri.fsPath).toLowerCase();
	const allowedExts = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"];
	if (!allowedExts.includes(ext)) {
		vscode.window.showErrorMessage(`Unsupported image format: ${ext}`);
		return;
	}

	try {
		const dims = await AssetManager.getImageDimensions(sourceUri);

		const relativePath = await AssetManager.importTexture(sourceUri);
		if (!relativePath) return;

		const worldW = scene.worldSize.width;
		const worldH = scene.worldSize.height;

		const imgW = dims?.width ?? worldW;
		const imgH = dims?.height ?? worldH;

		const centerX = worldW / 2;
		const centerY = worldH / 2;

		const updated = addReferenceImageToScene(scene, relativePath, centerX, centerY, imgW, imgH);
		host.getHistory().commit(updated, "add reference image");

		const textures = await AssetManager.loadTexturesAsDataUrls(document.uri, updated);
		host.postToWebview({ type: "texturesLoaded", textures } satisfies ExtensionToWebviewMessage);

		vscode.window.showInformationMessage(`Reference image added: ${relativePath}${dims ? ` (${dims.width}×${dims.height})` : ""}`);
	} catch (err) {
		log.error("[importReference] failed:", err);
		vscode.window.showErrorMessage(`Failed to import reference: ${err instanceof Error ? err.message : String(err)}`);
	}
}
