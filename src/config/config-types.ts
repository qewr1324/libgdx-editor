export interface LibGdxEditorConfig {
	version: string;
	defaultTheme: string;
	autoSaveDelayMs: number;
	showRulers: boolean;
	showGrid: boolean;
	defaultGridSize: number;
}

export const DEFAULT_CONFIG: LibGdxEditorConfig = {
	version: "1.0",
	defaultTheme: "win98",
	autoSaveDelayMs: 3000,
	showRulers: true,
	showGrid: true,
	defaultGridSize: 32,
};

export const CONFIG_DIR_NAME = ".libgdx-editor";
export const CONFIG_FILE_NAME = "config.json";
