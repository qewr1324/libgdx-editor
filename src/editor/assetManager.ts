import * as vscode from "vscode";
import * as path from "node:path";
import { imageSize } from "image-size";

export interface ImageDimensions {
	width: number;
	height: number;
}

export class AssetManager {
	private static getAssetsDir(sceneUri: vscode.Uri): vscode.Uri {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const sceneName = path.basename(sceneUri.fsPath, ".lgdx.json");
		return vscode.Uri.joinPath(sceneDir, `${sceneName}.assets`);
	}

	public static getAssetsDirName(sceneUri: vscode.Uri): string {
		const sceneName = path.basename(sceneUri.fsPath, ".lgdx.json");
		return `${sceneName}.assets`;
	}

	private static async generateUniqueName(assetsDir: vscode.Uri, ext: string): Promise<string> {
		let maxNum = -1;
		try {
			const entries = await vscode.workspace.fs.readDirectory(assetsDir);
			for (const [name] of entries) {
				const nameExt = path.extname(name).toLowerCase();
				if (nameExt !== ext) continue;
				const base = path.basename(name, nameExt);
				const num = Number.parseInt(base, 10);
				if (!Number.isNaN(num) && num > maxNum) {
					maxNum = num;
				}
			}
		} catch {
			// پوشه وجود ندارد
		}

		return `${maxNum + 1}${ext}`;
	}

	public static async importTexture(sceneUri: vscode.Uri, sourceUri: vscode.Uri): Promise<string> {
		const assetsDir = AssetManager.getAssetsDir(sceneUri);

		try {
			await vscode.workspace.fs.createDirectory(assetsDir);
		} catch {
			// از قبل هست
		}

		const originalName = path.basename(sourceUri.fsPath);
		const ext = path.extname(originalName).toLowerCase();
		const uniqueName = await AssetManager.generateUniqueName(assetsDir, ext);
		const targetUri = vscode.Uri.joinPath(assetsDir, uniqueName);

		const content = await vscode.workspace.fs.readFile(sourceUri);
		await vscode.workspace.fs.writeFile(targetUri, content);

		const assetsDirName = AssetManager.getAssetsDirName(sceneUri);
		return `${assetsDirName}/${uniqueName}`;
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

	public static async deleteTexture(sceneUri: vscode.Uri, relativePath: string): Promise<void> {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const targetUri = vscode.Uri.joinPath(sceneDir, relativePath);
		try {
			await vscode.workspace.fs.delete(targetUri);
		} catch {
			// نبود، اشکالی ندارد
		}
	}

	public static getAllUsedTextures(scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Set<string> {
		const set = new Set<string>();
		const visit = (objects: Array<{ texture?: string; children?: unknown }>) => {
			for (const obj of objects) {
				if (obj.texture) set.add(obj.texture);
				if (Array.isArray(obj.children)) visit(obj.children as Array<{ texture?: string; children?: unknown }>);
			}
		};
		for (const layer of scene.layers) {
			visit(layer.objects);
		}
		return set;
	}

	/**
	 * ✅ چک می‌کند کدام texture های صحنه فایلشون وجود نداره.
	 */
	public static async findBrokenAssets(sceneUri: vscode.Uri, scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Promise<string[]> {
		const used = AssetManager.getAllUsedTextures(scene);
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const broken: string[] = [];

		for (const relPath of used) {
			try {
				const targetUri = vscode.Uri.joinPath(sceneDir, relPath);
				await vscode.workspace.fs.stat(targetUri);
			} catch {
				broken.push(relPath);
			}
		}

		return broken;
	}

	public static async cleanupUnusedAssets(sceneUri: vscode.Uri, scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Promise<void> {
		const assetsDir = AssetManager.getAssetsDir(sceneUri);
		const assetsDirName = AssetManager.getAssetsDirName(sceneUri);
		const used = AssetManager.getAllUsedTextures(scene);

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

	public static async loadTexturesAsDataUrls(sceneUri: vscode.Uri, scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Promise<Record<string, string>> {
		const result: Record<string, string> = {};
		const used = AssetManager.getAllUsedTextures(scene);
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");

		for (const relPath of used) {
			try {
				const targetUri = vscode.Uri.joinPath(sceneDir, relPath);
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

	public static async migrateOldAssets(sceneUri: vscode.Uri, scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Promise<boolean> {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const oldAssetsDir = vscode.Uri.joinPath(sceneDir, "assets");
		const newAssetsDir = AssetManager.getAssetsDir(sceneUri);
		const newAssetsDirName = AssetManager.getAssetsDirName(sceneUri);

		const used = AssetManager.getAllUsedTextures(scene);
		const hasOldPaths = Array.from(used).some((t) => t.startsWith("assets/"));
		if (!hasOldPaths) return false;

		let migrated = false;
		try {
			const entries = await vscode.workspace.fs.readDirectory(oldAssetsDir);
			for (const [name, type] of entries) {
				if (type !== vscode.FileType.File) continue;
				const oldRelative = `assets/${name}`;
				if (!used.has(oldRelative)) continue;

				try {
					await vscode.workspace.fs.createDirectory(newAssetsDir);
				} catch {
					// ignore
				}

				const oldUri = vscode.Uri.joinPath(oldAssetsDir, name);
				const newUri = vscode.Uri.joinPath(newAssetsDir, name);
				try {
					const content = await vscode.workspace.fs.readFile(oldUri);
					await vscode.workspace.fs.writeFile(newUri, content);
					await vscode.workspace.fs.delete(oldUri);
					migrated = true;
				} catch {
					// ignore
				}
			}

			try {
				const remaining = await vscode.workspace.fs.readDirectory(oldAssetsDir);
				if (remaining.length === 0) {
					await vscode.workspace.fs.delete(oldAssetsDir);
				}
			} catch {
				// ignore
			}
		} catch {
			// پوشه قدیمی وجود ندارد
		}

		if (migrated) {
			for (const layer of scene.layers) {
				const visit = (objects: Array<{ texture?: string; children?: unknown }>) => {
					for (const obj of objects) {
						if (obj.texture && obj.texture.startsWith("assets/")) {
							const fileName = path.basename(obj.texture);
							obj.texture = `${newAssetsDirName}/${fileName}`;
						}
						if (Array.isArray(obj.children)) visit(obj.children as Array<{ texture?: string; children?: unknown }>);
					}
				};
				visit(layer.objects);
			}
		}

		return migrated;
	}
}
