export type RenderMode = "solid" | "wireframe";
export type GizmoMode = "world" | "object";
export type ShapeType = "rectangle" | "circle" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star";

export interface LibGdxEditorConfig {
	// ---------- General ----------
	version: string;
	defaultTheme: string;
	autoSaveDelayMs: number;

	// ---------- Editor defaults ----------
	showRulers: boolean;
	showGrid: boolean;
	defaultGridSize: number;

	// ---------- View ----------
	view: {
		renderMode: RenderMode;
		showGrid: boolean;
		showWorldBorder: boolean;
		showRulers: boolean;
	};

	// ---------- Gizmo ----------
	gizmo: {
		mode: GizmoMode;
	};

	// ---------- Grid ----------
	grid: {
		size: number;
		snap: boolean;
	};

	// ---------- UI ----------
	ui: {
		lastShapeType: ShapeType;
	};
}

export const DEFAULT_CONFIG: LibGdxEditorConfig = {
	version: "1.0",
	defaultTheme: "win98",
	autoSaveDelayMs: 3000,
	showRulers: true,
	showGrid: true,
	defaultGridSize: 32,

	view: {
		renderMode: "solid",
		showGrid: true,
		showWorldBorder: true,
		showRulers: true,
	},
	gizmo: {
		mode: "world",
	},
	grid: {
		size: 32,
		snap: false,
	},
	ui: {
		lastShapeType: "rectangle",
	},
};

export const CONFIG_DIR_NAME = ".libgdx-editor";
export const CONFIG_FILE_NAME = "config.json";
