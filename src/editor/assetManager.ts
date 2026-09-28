import * as vscode from "vscode";
import * as path from "node:path";

export class AssetManager {
	private static getAssetsDir(sceneUri: vscode.Uri): vscode.Uri {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		return vscode.Uri.joinPath(sceneDir, "assets");
	}

	/**
	 * یک نام عددی یکتا می‌سازد: 0.png, 1.png, 2.png, ...
	 */
	private static async generateUniqueName(assetsDir: vscode.Uri, ext: string): Promise<string> {
		// پیدا کردن بزرگ‌ترین شماره موجود
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

		return `assets/${uniqueName}`;
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

	public static async cleanupUnusedAssets(sceneUri: vscode.Uri, scene: { layers: Array<{ objects: Array<{ texture?: string; children?: unknown }> }> }): Promise<void> {
		const assetsDir = AssetManager.getAssetsDir(sceneUri);
		const used = AssetManager.getAllUsedTextures(scene);

		try {
			const entries = await vscode.workspace.fs.readDirectory(assetsDir);
			for (const [name] of entries) {
				const relativePath = `assets/${name}`;
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
}
