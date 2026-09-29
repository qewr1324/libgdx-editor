// src/features/texture-atlas/atlas-importer.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { AssetManager } from "../../editor/assetManager.js";
import { parseAtlasFile } from "./atlas-parser.js";
import type { AtlasData } from "./atlas-types.js";
import { log } from "../../shared/logger.js";

export class AtlasImporter {
	/**
	 * atlas.png رو import می‌کنه و اگه فایل .atlas همنام کنارش بود،
	 * اون رو هم parse می‌کنه.
	 */
	public static async importAtlas(sceneUri: vscode.Uri, sourceUri: vscode.Uri): Promise<{ texturePath: string; atlas: AtlasData | null }> {
		const texturePath = await AssetManager.importTexture(sceneUri, sourceUri);

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
			// فایل .atlas نیست — فقط texture معمولی
		}

		return { texturePath, atlas };
	}

	/**
	 * لیست region های یک atlas رو برمی‌گردونه (بدون import مجدد).
	 */
	public static async loadAtlasRegions(sceneUri: vscode.Uri, texturePath: string): Promise<AtlasData | null> {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const textureUri = vscode.Uri.joinPath(sceneDir, texturePath);
		const dir = vscode.Uri.joinPath(textureUri, "..");
		const baseName = path.basename(texturePath, path.extname(texturePath));
		const atlasUri = vscode.Uri.joinPath(dir, `${baseName}.atlas`);

		try {
			const content = await vscode.workspace.fs.readFile(atlasUri);
			const text = new TextDecoder().decode(content);
			const sceneDirFs = sceneDir.fsPath;
			const relativeAtlasPath = path.relative(sceneDirFs, atlasUri.fsPath).replace(/\\/g, "/");
			return parseAtlasFile(relativeAtlasPath, text, texturePath);
		} catch {
			return null;
		}
	}

	/**
	 * چک می‌کنه آیا برای این texture یه فایل .atlas همنام وجود داره یا نه.
	 */
	public static async hasAtlasFile(sceneUri: vscode.Uri, texturePath: string): Promise<boolean> {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const textureUri = vscode.Uri.joinPath(sceneDir, texturePath);
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
