// src/config/config-types.ts
import type { SnapConfig } from "../features/snapping/snap-types.js";
import { DEFAULT_SNAP_CONFIG } from "../features/snapping/snap-types.js";

export type RenderMode = "solid" | "wireframe";
export type GizmoMode = "world" | "object";
export type ShapeType = "rectangle" | "circle" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star";

export interface LibGdxEditorConfig {
	version: string;
	defaultTheme: string;
	autoSaveDelayMs: number;
	showRulers: boolean;
	showGrid: boolean;
	defaultGridSize: number;

	/** 🆕 مسیر پوشه‌ی assets نسبت به workspace (مثلاً "assets/") — خالی یعنی تنظیم نشده */
	assetsPath: string;

	view: {
		renderMode: RenderMode;
		showGrid: boolean;
		showWorldBorder: boolean;
		showRulers: boolean;
	};
	gizmo: {
		mode: GizmoMode;
	};
	grid: {
		size: number;
		snap: boolean;
	};
	ui: {
		lastShapeType: ShapeType;
	};
	snapping: SnapConfig;
}

export const DEFAULT_CONFIG: LibGdxEditorConfig = {
	version: "1.0",
	defaultTheme: "win98",
	autoSaveDelayMs: 3000,
	showRulers: true,
	showGrid: true,
	defaultGridSize: 32,

	assetsPath: "", // 🆕 خالی = تنظیم نشده (کاربر باید اول تنظیم کنه)

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
	snapping: { ...DEFAULT_SNAP_CONFIG },
};

export const CONFIG_DIR_NAME = ".libgdx-editor";
export const CONFIG_FILE_NAME = "config.json";
