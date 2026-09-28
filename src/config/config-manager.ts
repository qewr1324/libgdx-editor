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
		} catch {
			await this.saveToDisk(this.config);
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

	public async update(partial: Partial<LibGdxEditorConfig>): Promise<void> {
		this.config = { ...this.config, ...partial };
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
		if (!this.configUri) return;
		const content = new TextEncoder().encode(JSON.stringify(config, null, 2));
		try {
			await vscode.workspace.fs.writeFile(this.configUri, content);
		} catch (err) {
			console.error("Failed to save config:", err);
		}
	}

	private notifyListeners(): void {
		for (const handler of this.listeners) {
			try {
				handler(this.config);
			} catch {
				// ignore
			}
		}
	}
}
