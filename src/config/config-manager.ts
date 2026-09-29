import * as vscode from "vscode";
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, DEFAULT_CONFIG, type LibGdxEditorConfig } from "./config-types.js";

export class ConfigManager {
	private static instance: ConfigManager | null = null;
	private config: LibGdxEditorConfig = structuredClone(DEFAULT_CONFIG);
	private configUri: vscode.Uri | null = null;
	private loaded = false;

	private listeners = new Set<(config: LibGdxEditorConfig) => void>();

	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	public static resetInstance(): void {
		ConfigManager.instance = null;
	}

	public async load(): Promise<LibGdxEditorConfig> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			console.log("[ConfigManager] No workspace folder, using defaults");
			this.config = structuredClone(DEFAULT_CONFIG);
			this.loaded = true;
			return this.config;
		}

		const dirUri = vscode.Uri.joinPath(workspaceFolder.uri, CONFIG_DIR_NAME);
		const fileUri = vscode.Uri.joinPath(dirUri, CONFIG_FILE_NAME);
		this.configUri = fileUri;

		try {
			await vscode.workspace.fs.stat(dirUri);
		} catch {
			try {
				await vscode.workspace.fs.createDirectory(dirUri);
			} catch {
				// ignore
			}
		}

		try {
			const content = await vscode.workspace.fs.readFile(fileUri);
			const text = new TextDecoder().decode(content);
			const parsed = JSON.parse(text) as Partial<LibGdxEditorConfig>;
			this.config = this.merge(DEFAULT_CONFIG, parsed);
			console.log("[ConfigManager] Loaded config:", this.config);
		} catch {
			await this.saveToDisk(this.config);
			console.log("[ConfigManager] Created new config:", this.config);
		}

		this.loaded = true;
		return this.config;
	}

	public get(): LibGdxEditorConfig {
		return this.config;
	}

	public async set<K extends keyof LibGdxEditorConfig>(key: K, value: LibGdxEditorConfig[K]): Promise<void> {
		this.config = { ...this.config, [key]: value };
		await this.saveToDisk(this.config);
		this.notifyListeners();
	}

	/**
	 * ✅ به‌روزرسانی تودرتو (برای view/gizmo/grid/ui).
	 * مثال: update({ view: { renderMode: "wireframe" } })
	 */
	public async update(partial: DeepPartial<LibGdxEditorConfig>): Promise<void> {
		this.config = this.merge(this.config, partial);
		await this.saveToDisk(this.config);
		this.notifyListeners();
	}

	public onChange(handler: (config: LibGdxEditorConfig) => void): vscode.Disposable {
		this.listeners.add(handler);
		return {
			dispose: () => this.listeners.delete(handler),
		};
	}

	public isLoaded(): boolean {
		return this.loaded;
	}

	private async saveToDisk(config: LibGdxEditorConfig): Promise<void> {
		if (!this.configUri) {
			return;
		}
		const content = new TextEncoder().encode(JSON.stringify(config, null, 2));
		try {
			await vscode.workspace.fs.writeFile(this.configUri, content);
		} catch (err) {
			console.error("[ConfigManager] Failed to save:", err);
		}
	}

	private merge(base: LibGdxEditorConfig, partial: DeepPartial<LibGdxEditorConfig>): LibGdxEditorConfig {
		return {
			version: partial.version ?? base.version,
			defaultTheme: partial.defaultTheme ?? base.defaultTheme,
			autoSaveDelayMs: partial.autoSaveDelayMs ?? base.autoSaveDelayMs,
			showRulers: partial.showRulers ?? base.showRulers,
			showGrid: partial.showGrid ?? base.showGrid,
			defaultGridSize: partial.defaultGridSize ?? base.defaultGridSize,

			view: { ...base.view, ...(partial.view ?? {}) },
			gizmo: { ...base.gizmo, ...(partial.gizmo ?? {}) },
			grid: { ...base.grid, ...(partial.grid ?? {}) },
			ui: { ...base.ui, ...(partial.ui ?? {}) },
		};
	}

	private notifyListeners(): void {
		for (const handler of this.listeners) {
			try {
				handler(this.config);
			} catch (err) {
				console.error("[ConfigManager] listener error:", err);
			}
		}
	}
}

/** recursive partial */
type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
