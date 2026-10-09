// src/features/texture-atlas/atlas-importer.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { AssetManager } from "../../editor/assetManager.js";
import { parseAtlasFile } from "./atlas-parser.js";
import type { AtlasData } from "./atlas-types.js";
import { log } from "../../shared/logger.js";

export class AtlasImporter {
	/**
	 * 🆕 atlas.png رو از یه فایل داخل assets می‌گیره.
	 * فایل از قبل داخل assets هست، پس فقط parse می‌کنیم.
	 * اگه فایل .atlas همنام کنارش بود، parse می‌کنه.
	 */
	public static async importAtlas(sourceUri: vscode.Uri): Promise<{ texturePath: string; atlas: AtlasData | null }> {
		// texture رو توی assets کپی کن (اگه از قبل نیست)
		const texturePath = await AssetManager.importTexture(sourceUri);
		if (!texturePath) {
			return { texturePath: "", atlas: null };
		}

		const sourceDir = vscode.Uri.joinPath(sourceUri, "..");
		const baseName = path.basename(sourceUri.fsPath, path.extname(sourceUri.fsPath));
		const atlasUri = vscode.Uri.joinPath(sourceDir, `${baseName}.atlas`);

		let atlas: AtlasData | null = null;
		try {
			const content = await vscode.workspace.fs.readFile(atlasUri);
			const text = new TextDecoder().decode(content);
			atlas = parseAtlasFile(atlasUri.fsPath, text, texturePath);
			log.debug(`[atlas] parsed ${atlas.regions.length} regions from ${atlasUri.fsPath}`);
		} catch {
			// فایل .atlas نیست
		}

		return { texturePath, atlas };
	}

	/**
	 * 🆕 لیست region های یک atlas رو بر اساس texturePath (نسبی) برمی‌گردونه.
	 */
	public static async loadAtlasRegions(sceneUri: vscode.Uri, texturePath: string): Promise<AtlasData | null> {
		void sceneUri;
		const assetsDir = AssetManager.getAssetsDirUri();
		if (!assetsDir) return null;

		const textureUri = vscode.Uri.joinPath(assetsDir, texturePath);
		const dir = vscode.Uri.joinPath(textureUri, "..");
		const baseName = path.basename(texturePath, path.extname(texturePath));
		const atlasUri = vscode.Uri.joinPath(dir, `${baseName}.atlas`);

		try {
			const content = await vscode.workspace.fs.readFile(atlasUri);
			const text = new TextDecoder().decode(content);
			const relativeAtlasPath = path.relative(assetsDir.fsPath, atlasUri.fsPath).replace(/\\/g, "/");
			return parseAtlasFile(relativeAtlasPath, text, texturePath);
		} catch {
			return null;
		}
	}

	public static async hasAtlasFile(sceneUri: vscode.Uri, texturePath: string): Promise<boolean> {
		void sceneUri;
		const assetsDir = AssetManager.getAssetsDirUri();
		if (!assetsDir) return false;

		const textureUri = vscode.Uri.joinPath(assetsDir, texturePath);
		const dir = vscode.Uri.joinPath(textureUri, "..");
		const baseName = path.basename(texturePath, path.extname(texturePath));
		const atlasUri = vscode.Uri.joinPath(dir, `${baseName}.atlas`);

		try {
			await vscode.workspace.fs.stat(atlasUri);
			return true;
		} catch {
			return false;
		}
	}
}
