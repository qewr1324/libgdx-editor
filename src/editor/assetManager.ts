// src/editor/assetManager.ts
import * as vscode from "vscode";
import * as path from "node:path";
import { imageSize } from "image-size";
import { ConfigManager } from "../config/config-manager.js";

export interface ImageDimensions {
	width: number;
	height: number;
}

// type helper برای scene ای که ممکنه reference داشته باشه
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
	// 🆕 Assets path helpers (بر اساس config.assetsPath)
	// ============================================================

	/**
	 * مسیر پوشه‌ی assets رو از config می‌خونه.
	 * اگه تنظیم نشده باشه، null برمی‌گردونه.
	 */
	public static getConfiguredAssetsPath(): string | null {
		const config = ConfigManager.getInstance().get();
		const p = config.assetsPath?.trim();
		if (!p) return null;
		return p;
	}

	/**
	 * Uri پوشه‌ی assets رو برمی‌گردونه (نسبت به workspace folder).
	 * اگه config تنظیم نشده باشه یا workspace نباشه، null برمی‌گردونه.
	 */
	public static getAssetsDirUri(): vscode.Uri | null {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return null;

		const assetsPath = AssetManager.getConfiguredAssetsPath();
		if (!assetsPath) return null;

		// مسیر نسبی رو تمیز کن (حذف / ابتدایی و انتهایی)
		const clean = assetsPath.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		if (!clean) return null;

		return vscode.Uri.joinPath(workspaceFolder.uri, clean);
	}

	/**
	 * نام پوشه‌ی assets (برای ساخت مسیرهای نسبی داخل صحنه).
	 * مثلاً اگه config بگه "assets/game"، مقدار "assets/game" برمی‌گرده.
	 */
	public static getAssetsDirName(): string {
		return AssetManager.getConfiguredAssetsPath() ?? "";
	}

	/**
	 * چک می‌کنه که assets path تنظیم شده باشه. اگه نه، پیام خطا می‌ده.
	 */
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

	/**
	 * یه فایل رو داخل پوشه‌ی assets کپی می‌کنه و مسیر نسبی رو برمی‌گردونه.
	 * 🆕 این تابع دیگه خودش تصمیم نمی‌گیره کجا بذاره — از config می‌خونه.
	 * اگه config تنظیم نشده باشه، null برمی‌گردونه.
	 */
	public static async importTexture(sourceUri: vscode.Uri): Promise<string | null> {
		const assetsDir = AssetManager.getAssetsDirUri();
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
		const ext = path.extname(originalName).toLowerCase();

		// 🆕 اگه فایل با همین اسم توی assets هست، همون رو return کن
		// (چون کاربر خودش انتخاب کرده که فایل کجاست)
		const existingUri = vscode.Uri.joinPath(assetsDir, originalName);
		try {
			await vscode.workspace.fs.stat(existingUri);
			return `${assetsDirName}/${originalName}`;
		} catch {
			// فایل نیست، کپی کن
		}

		const targetUri = vscode.Uri.joinPath(assetsDir, originalName);
		const content = await vscode.workspace.fs.readFile(sourceUri);
		await vscode.workspace.fs.writeFile(targetUri, content);

		return `${assetsDirName}/${originalName}`;
	}

	/**
	 * 🆕 یه فایل رو از داخل assets (بر اساس مسیر نسبی) به صحنه دیگه کپی می‌کنه.
	 */
	public static async copyAssetFromScene(_sourceSceneUri: vscode.Uri, _targetSceneUri: vscode.Uri, sourceRelativePath: string): Promise<string> {
		// چون assets الان global هست، نیازی به کپی بین صحنه‌ها نیست.
		// فقط چک کن فایل وجود داره.
		const assetsDir = AssetManager.getAssetsDirUri();
		if (!assetsDir) return sourceRelativePath;

		try {
			await vscode.workspace.fs.stat(vscode.Uri.joinPath(assetsDir, sourceRelativePath));
			return sourceRelativePath;
		} catch {
			return sourceRelativePath;
		}
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
	// Cleanup / Query
	// ============================================================

	public static async deleteTexture(relativePath: string): Promise<void> {
		const assetsDir = AssetManager.getAssetsDirUri();
		if (!assetsDir) return;
		const targetUri = vscode.Uri.joinPath(assetsDir, relativePath);
		try {
			await vscode.workspace.fs.delete(targetUri);
		} catch {
			// نبود، اشکالی ندارد
		}
	}

	/**
	 * همه texture های استفاده‌شده (شامل reference image).
	 */
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
		void sceneUri;
		const used = AssetManager.getAllUsedTextures(scene);
		const assetsDir = AssetManager.getAssetsDirUri();
		const broken: string[] = [];

		if (!assetsDir) {
			// اگه assets تنظیم نشده، همه broken هستن
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
		void sceneUri;
		const assetsDir = AssetManager.getAssetsDirUri();
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
		void sceneUri;
		const result: Record<string, string> = {};
		const used = AssetManager.getAllUsedTextures(scene);
		const assetsDir = AssetManager.getAssetsDirUri();

		if (!assetsDir) return result;

		for (const relPath of used) {
			try {
				const targetUri = vscode.Uri.joinPath(assetsDir, relPath);
				const content = await vscode.workspace.fs.readFile(targetUri);
				const ext = path.extname(relPath).toLowerCase();
				const mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : ext === ".webp" ? "image/webp" : ext === ".svg" ? "image/svg+xml" : "application/octet-stream";
				const base64 = Buffer.from(content).toString("base64");
				result[relPath] = `data:${mime};base64,${base64}`;
			} catch {
				// فایل نیست — رد کن
			}
		}
		return result;
	}

	// ============================================================
	// 🆕 File pickers محدود به assets
	// ============================================================

	/**
	 * یه فایل تصویری از داخل پوشه‌ی assets انتخاب می‌کنه.
	 * اگه assets تنظیم نشده باشه، null برمی‌گردونه.
	 */
	public static async pickImageFromAssets(): Promise<{ uri: vscode.Uri; relativePath: string } | null> {
		const assetsDir = AssetManager.getAssetsDirUri();
		const assetsDirName = AssetManager.getAssetsDirName();

		if (!assetsDir || !assetsDirName) {
			void vscode.window.showErrorMessage("Assets folder is not set. Please set it in Scene Settings first.");
			return null;
		}

		// چک کن پوشه وجود داره
		try {
			await vscode.workspace.fs.stat(assetsDir);
		} catch {
			void vscode.window.showErrorMessage(`Assets folder does not exist: ${assetsDirName}. Please create it or change the path.`);
			return null;
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

		// 🆕 چک کن داخل assets باشه
		const assetsFs = assetsDir.fsPath.toLowerCase();
		const pickedFs = picked.fsPath.toLowerCase();
		const normalizedAssets = assetsFs.endsWith(path.sep) ? assetsFs : assetsFs + path.sep;

		if (!pickedFs.startsWith(normalizedAssets) && pickedFs !== assetsFs) {
			void vscode.window.showErrorMessage("Please select a file inside the assets folder.");
			return null;
		}

		const relative = path.relative(assetsDir.fsPath, picked.fsPath).replace(/\\/g, "/");
		const relativePath = `${assetsDirName}/${relative}`;

		return { uri: picked, relativePath };
	}

	/**
	 * 🆕 انتخاب پوشه‌ی assets توسط کاربر.
	 * relative به workspace برمی‌گردونه (مثل "assets/").
	 */
	public static async pickAssetsFolder(): Promise<string | null> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			void vscode.window.showErrorMessage("No workspace folder open.");
			return null;
		}

		const uris = await vscode.window.showOpenDialog({
			canSelectFiles: false,
			canSelectFolders: true,
			canSelectMany: false,
			defaultUri: workspaceFolder.uri,
			title: "Select Assets Folder",
		});

		if (!uris || uris.length === 0) return null;

		const picked = uris[0];

		// باید داخل workspace باشه
		const workspaceFs = workspaceFolder.uri.fsPath.toLowerCase();
		const pickedFs = picked.fsPath.toLowerCase();
		const normalizedWorkspace = workspaceFs.endsWith(path.sep) ? workspaceFs : workspaceFs + path.sep;

		if (!pickedFs.startsWith(normalizedWorkspace) && pickedFs !== workspaceFs) {
			void vscode.window.showErrorMessage("Assets folder must be inside the workspace.");
			return null;
		}

		const relative = path.relative(workspaceFolder.uri.fsPath, picked.fsPath).replace(/\\/g, "/");
		return relative || ".";
	}

	/**
	 * 🆕 چک می‌کنه آیا مسیر داده شده یک پوشه‌ی معتبر داخل workspace هست.
	 */
	public static async validateAssetsPath(relativePath: string): Promise<boolean> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) return false;

		const clean = relativePath.replace(/^[/\\]+/, "").replace(/[/\\]+$/, "");
		if (!clean) return false;

		const uri = vscode.Uri.joinPath(workspaceFolder.uri, clean);
		try {
			const stat = await vscode.workspace.fs.stat(uri);
			return (stat.type & vscode.FileType.Directory) !== 0;
		} catch {
			return false;
		}
	}
}
