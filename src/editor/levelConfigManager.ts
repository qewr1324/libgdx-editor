import * as vscode from "vscode";
import * as path from "node:path";
import { DEFAULT_LEVEL_CONFIG, getLevelConfigFileName, type LevelConfig } from "../types/level-config.js";

/**
 * مدیریت level config مخصوص هر scene.
 * هر scene یک config جدا دارد کنار فایل خودش.
 */
export class LevelConfigManager {
	private static cache = new Map<string, LevelConfig>();

	/**
	 * مسیر فایل config را از روی scene برمی‌گرداند.
	 */
	public static getConfigUri(sceneUri: vscode.Uri): vscode.Uri {
		const sceneDir = vscode.Uri.joinPath(sceneUri, "..");
		const fileName = getLevelConfigFileName(path.basename(sceneUri.fsPath));
		return vscode.Uri.joinPath(sceneDir, fileName);
	}

	/**
	 * config را برای scene بارگذاری می‌کند. اگر نبود، می‌سازد.
	 */
	public static async load(sceneUri: vscode.Uri): Promise<LevelConfig> {
		const key = sceneUri.toString();
		const cached = LevelConfigManager.cache.get(key);
		if (cached) return cached;

		const configUri = LevelConfigManager.getConfigUri(sceneUri);

		try {
			const content = await vscode.workspace.fs.readFile(configUri);
			const text = new TextDecoder().decode(content);
			const parsed = JSON.parse(text) as Partial<LevelConfig>;
			const merged = LevelConfigManager.merge(DEFAULT_LEVEL_CONFIG, parsed);
			LevelConfigManager.cache.set(key, merged);
			return merged;
		} catch {
			// فایل نیست — بساز
			const created = { ...DEFAULT_LEVEL_CONFIG };
			await LevelConfigManager.save(sceneUri, created);
			LevelConfigManager.cache.set(key, created);
			return created;
		}
	}

	/**
	 * config را ذخیره می‌کند.
	 */
	public static async save(sceneUri: vscode.Uri, config: LevelConfig): Promise<void> {
		const configUri = LevelConfigManager.getConfigUri(sceneUri);
		const content = new TextEncoder().encode(JSON.stringify(config, null, 2));
		await vscode.workspace.fs.writeFile(configUri, content);
		LevelConfigManager.cache.set(sceneUri.toString(), config);
	}

	/**
	 * یک به‌روزرسانی partial اعمال می‌کند.
	 */
	public static async update(sceneUri: vscode.Uri, partial: Partial<LevelConfig>): Promise<LevelConfig> {
		const current = await LevelConfigManager.load(sceneUri);
		const updated = LevelConfigManager.merge(current, partial);
		await LevelConfigManager.save(sceneUri, updated);
		return updated;
	}

	/**
	 * کش را برای یک scene پاک می‌کند (وقتی فایل بسته می‌شود).
	 */
	public static invalidate(sceneUri: vscode.Uri): void {
		LevelConfigManager.cache.delete(sceneUri.toString());
	}

	private static merge(base: LevelConfig, partial: Partial<LevelConfig>): LevelConfig {
		return {
			version: partial.version ?? base.version,
			view: { ...base.view, ...(partial.view ?? {}) },
			gizmo: { ...base.gizmo, ...(partial.gizmo ?? {}) },
			grid: { ...base.grid, ...(partial.grid ?? {}) },
			ui: { ...base.ui, ...(partial.ui ?? {}) },
		};
	}
}
