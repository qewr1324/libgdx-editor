// src/editor/assetManager.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { imageSize } from "image-size";
import { ConfigManager } from "../config/config-manager.js";

export interface ImageDimensions {
	width: number;
	height: number;
}

interface SceneLike {
	layers: Array<{
		objects: Array<{
			texture?: string;
			components?: Array<{ type: string; texture?: string }>;
			properties?: Record<string, unknown>;
			children?: unknown;
		}>;
	}>;
	referenceImage?: { texture: string } | null;
}

export class AssetManager {
	// ============================================================
	// Assets path helpers
	// ============================================================

	public static getConfiguredAssetsPath(): string | null {
		const config = ConfigManager.getInstance().get();
		const p = config.assetsPath?.trim();
		if (!p) return null;
		return p;
	}

	/**
	 * 🆕 Uri پوشه‌ی assets رو برمی‌گردونه.
	 * @param sceneUri - اگه داده بشه، نسبت به پوشه‌ی صحنه ساخته می‌شه.
	 *                   اگه نه، نسبت به اولین workspace folder.
	 */
	public static getAssetsDirUri(sceneUri?: vscode.Uri): vscode.Uri | null {
		const assetsPath = AssetManager.getConfiguredAssetsPath();
		if (!assetsPath) return null;

		const clean = assetsPath.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		if (!clean) return null;

		// 🆕 اولویت ۱: نسبت به پوشه‌ی صحنه
		if (sceneUri) {
			const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
			return vscode.Uri.joinPath(sceneDir, clean);
		}

		// 🆕 اولویت ۲: نسبت به workspace
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return null;

		return vscode.Uri.joinPath(workspaceFolder.uri, clean);
	}

	public static getAssetsDirName(): string {
		return AssetManager.getConfiguredAssetsPath() ?? "";
	}

	public static ensureAssetsConfigured(): boolean {
		const assetsPath = AssetManager.getConfiguredAssetsPath();
		if (!assetsPath) {
			void vscode.window.showErrorMessage("Assets folder is not set. Please set it in Scene Settings first.", "Open Scene Settings").then((choice) => {
				if (choice === "Open Scene Settings") {
					void vscode.commands.executeCommand("libgdx-editor.openEditor");
				}
			});
			return false;
		}
		return true;
	}

	// ============================================================
	// Import
	// ============================================================

	public static async importTexture(sourceUri: vscode.Uri, sceneUri?: vscode.Uri): Promise<string | null> {
		const assetsDir = AssetManager.getAssetsDirUri(sceneUri);
		const assetsDirName = AssetManager.getAssetsDirName();

		if (!assetsDir || !assetsDirName) {
			void vscode.window.showErrorMessage("Assets folder is not set. Please set it in Scene Settings first.");
			return null;
		}

		try {
			await vscode.workspace.fs.createDirectory(assetsDir);
		} catch {
			// از قبل هست
		}

		const originalName = path.basename(sourceUri.fsPath);
		const targetUri = vscode.Uri.joinPath(assetsDir, originalName);

		// 🆕 اگه فایل با همین اسم توی assets هست، همون رو return کن
		try {
			await vscode.workspace.fs.stat(targetUri);
			return `${assetsDirName}/${originalName}`;
		} catch {
			// فایل نیست، کپی کن
		}

		const content = await vscode.workspace.fs.readFile(sourceUri);
		await vscode.workspace.fs.writeFile(targetUri, content);

		return `${assetsDirName}/${originalName}`;
	}

	public static async getImageDimensions(sourceUri: vscode.Uri): Promise<ImageDimensions | null> {
		try {
			const content = await vscode.workspace.fs.readFile(sourceUri);
			const buffer = Buffer.from(content);
			const result = imageSize(buffer);
			if (result.width && result.height) {
				return { width: result.width, height: result.height };
			}
			return null;
		} catch {
			return null;
		}
	}

	// ============================================================
	// Query
	// ============================================================

	public static getAllUsedTextures(scene: SceneLike): Set<string> {
		const set = new Set<string>();
		const visit = (objects: Array<{ texture?: string; components?: Array<{ type: string; texture?: string }>; properties?: Record<string, unknown>; children?: unknown }>) => {
			for (const obj of objects) {
				if (obj.texture) set.add(obj.texture);

				if (obj.components) {
					for (const comp of obj.components) {
						if (comp.texture) set.add(comp.texture);
					}
				}

				const atlasRaw = obj.properties?.atlas as { texture?: string } | undefined;
				if (atlasRaw?.texture) set.add(atlasRaw.texture);

				if (Array.isArray(obj.children)) {
					visit(obj.children as Array<{ texture?: string; components?: Array<{ type: string; texture?: string }>; properties?: Record<string, unknown>; children?: unknown }>);
				}
			}
		};

		for (const layer of scene.layers) {
			visit(layer.objects);
		}

		if (scene.referenceImage?.texture) {
			set.add(scene.referenceImage.texture);
		}

		return set;
	}

	public static async findBrokenAssets(sceneUri: vscode.Uri, scene: SceneLike): Promise<string[]> {
		const used = AssetManager.getAllUsedTextures(scene);
		const assetsDir = AssetManager.getAssetsDirUri(sceneUri);
		const broken: string[] = [];

		if (!assetsDir) {
			return Array.from(used);
		}

		for (const relPath of used) {
			try {
				const targetUri = vscode.Uri.joinPath(assetsDir, relPath);
				await vscode.workspace.fs.stat(targetUri);
			} catch {
				broken.push(relPath);
			}
		}

		return broken;
	}

	public static async cleanupUnusedAssets(sceneUri: vscode.Uri, scene: SceneLike): Promise<void> {
		const assetsDir = AssetManager.getAssetsDirUri(sceneUri);
		const assetsDirName = AssetManager.getAssetsDirName();
		const used = AssetManager.getAllUsedTextures(scene);

		if (!assetsDir || !assetsDirName) return;

		try {
			const entries = await vscode.workspace.fs.readDirectory(assetsDir);
			for (const [name] of entries) {
				const relativePath = `${assetsDirName}/${name}`;
				if (!used.has(relativePath)) {
					try {
						await vscode.workspace.fs.delete(vscode.Uri.joinPath(assetsDir, name));
					} catch {
						// ignore
					}
				}
			}
		} catch {
			// پوشه assets وجود ندارد
		}
	}

	public static async loadTexturesAsDataUrls(sceneUri: vscode.Uri, scene: SceneLike): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		const used = AssetManager.getAllUsedTextures(scene);
		const assetsDir = AssetManager.getAssetsDirUri(sceneUri);

		if (!assetsDir) {
			console.warn("[AssetManager] assetsDir is null, cannot load textures");
			return result;
		}

		console.log(`[AssetManager] loading ${used.size} textures from ${assetsDir.fsPath}`);

		for (const relPath of used) {
			try {
				// 🆕 اگه relPath شامل assetsDirName هست، حذفش کن چون assetsDir خودش اون رو داره
				const assetsDirName = AssetManager.getAssetsDirName();
				let relativeToAssetsDir = relPath;
				if (assetsDirName && relPath.startsWith(`${assetsDirName}/`)) {
					relativeToAssetsDir = relPath.slice(assetsDirName.length + 1);
				}

				const targetUri = vscode.Uri.joinPath(assetsDir, relativeToAssetsDir);
				const content = await vscode.workspace.fs.readFile(targetUri);
				const ext = path.extname(relPath).toLowerCase();
				const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
				const base64 = Buffer.from(content).toString("base64");
				result[relPath] = `data:${mime};base64,${base64}`;
			} catch (err) {
				console.warn(`[AssetManager] failed to load texture: ${relPath}`, err);
			}
		}
		return result;
	}

	// ============================================================
	// File pickers
	// ============================================================

	/**
	 * 🆕 انتخاب فایل تصویری از داخل assets.
	 * @param sceneUri - اگه داده بشه، assets نسبت به صحنه ساخته می‌شه.
	 */
	public static async pickImageFromAssets(sceneUri?: vscode.Uri): Promise<{ uri: vscode.Uri; relativePath: string } | null> {
		const assetsDir = AssetManager.getAssetsDirUri(sceneUri);
		const assetsDirName = AssetManager.getAssetsDirName();

		if (!assetsDir || !assetsDirName) {
			void vscode.window.showErrorMessage("Assets folder is not set. Please set it in Scene Settings first.");
			return null;
		}

		// چک کن پوشه وجود داره — اگه نه، بسازش
		try {
			await vscode.workspace.fs.stat(assetsDir);
		} catch {
			try {
				await vscode.workspace.fs.createDirectory(assetsDir);
			} catch {
				void vscode.window.showErrorMessage(`Could not create assets folder: ${assetsDir.fsPath}`);
				return null;
			}
		}

		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			defaultUri: assetsDir,
			filters: {
				Images: ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"],
			},
			title: "Select Image from Assets",
		});

		if (!uris || uris.length === 0) return null;

		const picked = uris[0];

		// چک کن داخل assets باشه
		const assetsFs = assetsDir.fsPath.toLowerCase();
		const pickedFs = picked.fsPath.toLowerCase();
		const normalizedAssets = assetsFs.endsWith(path.sep) ? assetsFs : assetsFs + path.sep;

		if (!pickedFs.startsWith(normalizedAssets) && pickedFs !== assetsFs) {
			void vscode.window.showErrorMessage(`Please select a file inside the assets folder (${assetsDirName}).`);
			return null;
		}

		const relative = path.relative(assetsDir.fsPath, picked.fsPath).replace(/\\/g, "/");
		const relativePath = `${assetsDirName}/${relative}`;

		return { uri: picked, relativePath };
	}

	/**
	 * 🆕 انتخاب پوشه‌ی assets.
	 * اگه sceneUri بدی، relative به پوشه‌ی صحنه محاسبه می‌شه.
	 * وگرنه نسبت به workspace.
	 */
	public static async pickAssetsFolder(sceneUri?: vscode.Uri): Promise<string | null> {
		const baseDir = sceneUri ? vscode.Uri.joinPath(sceneUri, "..") : vscode.workspace.workspaceFolders?.[0]?.uri;

		if (!baseDir) {
			void vscode.window.showErrorMessage("No workspace folder open.");
			return null;
		}

		const uris = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: baseDir,
			title: "Select Assets Folder",
		});

		if (!uris || uris.length === 0) return null;

		const picked = uris[0];

		// باید داخل baseDir باشه
		const baseFs = baseDir.fsPath.toLowerCase();
		const pickedFs = picked.fsPath.toLowerCase();
		const normalizedBase = baseFs.endsWith(path.sep) ? baseFs : baseFs + path.sep;

		if (!pickedFs.startsWith(normalizedBase) && pickedFs !== baseFs) {
			void vscode.window.showErrorMessage(sceneUri ? "Assets folder must be inside the scene folder." : "Assets folder must be inside the workspace.");
			return null;
		}

		const relative = path.relative(baseDir.fsPath, picked.fsPath).replace(/\\/g, "/");
		return relative || ".";
	}

	public static async validateAssetsPath(relativePath: string, sceneUri?: vscode.Uri): Promise<boolean> {
		const baseDir = sceneUri ? vscode.Uri.joinPath(sceneUri, "..") : vscode.workspace.workspaceFolders?.[0]?.uri;

		if (!baseDir) return false;

		const clean = relativePath.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		if (!clean) return false;

		const uri = vscode.Uri.joinPath(baseDir, clean);
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			return (stat.type & vscode.FileType.Directory) !== 0;
		} catch {
			return false;
		}
	}
}
