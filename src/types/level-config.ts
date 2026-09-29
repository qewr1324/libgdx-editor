export type RenderMode = "solid" | "wireframe";
export type GizmoMode = "world" | "object";
export type ShapeType = "rectangle" | "circle" | "triangle" | "diamond" | "pentagon" | "hexagon" | "star";

export interface LevelConfig {
	version: string;
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
}

export const DEFAULT_LEVEL_CONFIG: LevelConfig = {
	version: "1.0",
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

/** نام فایل config کنار هر scene. مثال: level1.lgdx.json → level1.config.json */
export function getLevelConfigFileName(sceneUri: string): string {
	const base = sceneUri.replace(/\.lgdx\.json$/i, "");
	return `${base}.config.json`;
}

export function getLevelConfigUri(sceneFsPath: string): string {
	const base = sceneFsPath.replace(/\.lgdx\.json$/i, "");
	return `${base}.config.json`;
}
