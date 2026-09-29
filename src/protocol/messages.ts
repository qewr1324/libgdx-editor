import type { GameObject, Scene } from "../types/scene.js";
import type { LibGdxEditorConfig, RenderMode, GizmoMode, ShapeType } from "../config/config-types.js";

/** پیام config که بین extension و webview رد و بدل می‌شود */
export interface LibGdxEditorConfigMessage {
	version: string;
	defaultTheme: string;
	autoSaveDelayMs: number;
	showRulers: boolean;
	showGrid: boolean;
	defaultGridSize: number;

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

export function toConfigMessage(config: LibGdxEditorConfig): LibGdxEditorConfigMessage {
	return {
		version: config.version,
		defaultTheme: config.defaultTheme,
		autoSaveDelayMs: config.autoSaveDelayMs,
		showRulers: config.showRulers,
		showGrid: config.showGrid,
		defaultGridSize: config.defaultGridSize,
		view: { ...config.view },
		gizmo: { ...config.gizmo },
		grid: { ...config.grid },
		ui: { ...config.ui },
	};
}

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| { type: "save"; scene: Scene }
	| { type: "sceneChanged"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "requestAddObject"; objectType: GameObject["type"]; x: number; y: number }
	| { type: "requestAddShape"; shapeType: ShapeType; x: number; y: number }
	| { type: "requestAddTexture"; x: number; y: number }
	| { type: "requestImportTexture" }
	| { type: "updateObject"; object: GameObject; historyLabel?: string }
	| { type: "updateObjects"; objects: GameObject[]; historyLabel?: string }
	| { type: "updateSceneField"; field: string; value: unknown; historyLabel?: string }
	| { type: "deleteObject"; objectId: string }
	| { type: "deleteObjects"; objectIds: string[] }
	| { type: "openSceneSettings" }
	| { type: "duplicateObjects"; objectIds: string[]; offsetX: number; offsetY: number }
	| { type: "pasteObjects"; objects: GameObject[]; historyLabel?: string }
	| { type: "undo" }
	| { type: "redo" }
	| { type: "updateConfig"; key: string; value: unknown }
	| { type: "updateConfigPartial"; partial: Record<string, unknown> }
	| { type: "requestConfig" };

export type ExtensionToWebviewMessage =
	| { type: "load"; scene: Scene }
	| { type: "update"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "selectFromOutliner"; objectId: string | null }
	| { type: "objectUpdated"; object: GameObject }
	| { type: "focusObject"; objectId: string }
	| { type: "texturesLoaded"; textures: Record<string, string> }
	| { type: "historyState"; canUndo: boolean; canRedo: boolean }
	| { type: "configLoaded"; config: LibGdxEditorConfigMessage }
	| { type: "configUpdated"; config: LibGdxEditorConfigMessage };

export type InspectorToExtensionMessage =
	| { type: "inspectorReady" }
	| { type: "updateObjectField"; objectId: string; field: string; value: unknown; historyLabel?: string }
	| { type: "updateSceneField"; field: string; value: unknown; historyLabel?: string }
	| { type: "deleteObject"; objectId: string }
	| { type: "focusObject"; objectId: string }
	| { type: "updateConfig"; key: string; value: unknown }
	| { type: "updateConfigPartial"; partial: Record<string, unknown> }
	| { type: "requestConfig" };

export type ExtensionToInspectorMessage =
	| { type: "showObject"; object: GameObject }
	| { type: "showMultiSelection"; count: number; ids: string[] }
	| { type: "showScene"; scene: Scene }
	| { type: "showSceneSettings"; scene: Scene }
	| { type: "clearSelection" }
	| { type: "configLoaded"; config: LibGdxEditorConfigMessage }
	| { type: "configUpdated"; config: LibGdxEditorConfigMessage };
