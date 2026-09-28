import * as vscode from "vscode";
import { CONFIG_DIR_NAME, CONFIG_FILE_NAME, DEFAULT_CONFIG, type LibGdxEditorConfig } from "./config-types.js";

export class ConfigManager {
	private static instance: ConfigManager | null = null;
	private config: LibGdxEditorConfig = { ...DEFAULT_CONFIG };
	private configUri: vscode.Uri | null = null;
	private loaded = false;

	private listeners = new Set<(config: LibGdxEditorConfig) => void>();

	public static getInstance(): ConfigManager {
		if (!ConfigManager.instance) {
			ConfigManager.instance = new ConfigManager();
		}
		return ConfigManager.instance;
	}

	public async load(): Promise<LibGdxEditorConfig> {
		const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
		if (!workspaceFolder) {
			console.log("[ConfigManager] No workspace folder, using defaults");
			this.config = { ...DEFAULT_CONFIG };
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
			this.config = { ...DEFAULT_CONFIG, ...parsed };
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
		console.log("[ConfigManager] set", key, "=", value);
		this.config = { ...this.config, [key]: value };
		await this.saveToDisk(this.config);
		console.log("[ConfigManager] notifying", this.listeners.size, "listeners");
		this.notifyListeners();
	}

	public async update(partial: Partial<LibGdxEditorConfig>): Promise<void> {
		console.log("[ConfigManager] update", partial);
		this.config = { ...this.config, ...partial };
		await this.saveToDisk(this.config);
		this.notifyListeners();
	}

	public onChange(handler: (config: LibGdxEditorConfig) => void): vscode.Disposable {
		console.log("[ConfigManager] listener added, total:", this.listeners.size + 1);
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
			console.log("[ConfigManager] No configUri, skipping save");
			return;
		}
		const content = new TextEncoder().encode(JSON.stringify(config, null, 2));
		try {
			await vscode.workspace.fs.writeFile(this.configUri, content);
			console.log("[ConfigManager] Saved to disk");
		} catch (err) {
			console.error("[ConfigManager] Failed to save:", err);
		}
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