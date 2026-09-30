// src/protocol/messages.ts
import type { GameObject, Layer, Scene } from "../types/scene.js";
import type { LibGdxEditorConfig, RenderMode, GizmoMode, ShapeType } from "../config/config-types.js";
import type { AtlasSpriteProperties } from "../features/texture-atlas/atlas-types.js";
import type { Component, ComponentType } from "../types/components.js";

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
	snapping: {
		enabled: boolean;
		threshold: number;
		snapToObjects: boolean;
		snapToWorldEdges: boolean;
		snapToGrid: boolean;
		showGuides: boolean;
		guideColor: string;
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
		snapping: { ...config.snapping },
	};
}

// ============================================================
// Webview (viewport) <-> Extension
// ============================================================

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| { type: "save"; scene: Scene }
	| { type: "sceneChanged"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "requestAddObject"; objectType: GameObject["type"]; x: number; y: number; layerId?: string }
	| { type: "requestAddSprite"; x: number; y: number; layerId?: string }
	| { type: "requestAddText"; x: number; y: number; layerId?: string }
	| { type: "requestAddShape"; shapeType: ShapeType; x: number; y: number; layerId?: string }
	| { type: "requestAddTexture"; x: number; y: number; layerId?: string }
	| { type: "requestAddEmptyObject"; x: number; y: number; layerId?: string }
	| { type: "requestImportTexture" }
	| { type: "updateObject"; object: GameObject; historyLabel?: string }
	| { type: "updateObjects"; objects: GameObject[]; historyLabel?: string }
	| { type: "updateSceneField"; field: string; value: unknown; historyLabel?: string }
	| { type: "deleteObject"; objectId: string }
	| { type: "deleteObjects"; objectIds: string[] }
	| { type: "openSceneSettings" }
	| { type: "duplicateObjects"; objectIds: string[]; offsetX: number; offsetY: number }
	| { type: "copyObjects"; objectIds: string[] }
	| { type: "cutObjects"; objectIds: string[] }
	| { type: "pasteObjects"; pasteInPlace?: boolean }
	| { type: "setObjectZIndex"; objectId: string; zIndex: number }
	| { type: "bringForward"; objectId: string }
	| { type: "sendBackward"; objectId: string }
	| { type: "bringToFront"; objectId: string }
	| { type: "sendToBack"; objectId: string }
	| { type: "undo" }
	| { type: "redo" }
	| { type: "updateConfig"; key: string; value: unknown }
	| { type: "updateConfigPartial"; partial: Record<string, unknown> }
	| { type: "requestConfig" }
	| { type: "requestAtlasRegions"; texturePath: string };

export type ExtensionToWebviewMessage =
	| { type: "load"; scene: Scene }
	| { type: "update"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "selectFromOutliner"; objectId: string | null }
	| { type: "objectUpdated"; object: GameObject }
	| { type: "focusObject"; objectId: string }
	| { type: "texturesLoaded"; textures: Record<string, string> }
	| { type: "brokenAssets"; paths: string[] }
	| { type: "clipboardChanged"; count: number }
	| { type: "historyState"; canUndo: boolean; canRedo: boolean }
	| { type: "configLoaded"; config: LibGdxEditorConfigMessage }
	| { type: "configUpdated"; config: LibGdxEditorConfigMessage }
	| AtlasRegionsMessage
	| AtlasNotFoundMessage;

// ============================================================
// Inspector (Properties) <-> Extension
// ============================================================

export type InspectorToExtensionMessage =
	| { type: "inspectorReady" }
	| { type: "updateObjectField"; objectId: string; field: string; value: unknown; historyLabel?: string }
	| { type: "updateSceneField"; field: string; value: unknown; historyLabel?: string }
	| { type: "deleteObject"; objectId: string }
	| { type: "focusObject"; objectId: string }
	| { type: "removeComponent"; objectId: string; componentId: string }
	| { type: "setObjectZIndex"; objectId: string; zIndex: number }
	| { type: "bringForward"; objectId: string }
	| { type: "sendBackward"; objectId: string }
	| { type: "bringToFront"; objectId: string }
	| { type: "sendToBack"; objectId: string }
	| { type: "moveObjectToLayer"; objectId: string; layerId: string }
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
	| { type: "configUpdated"; config: LibGdxEditorConfigMessage }
	| { type: "layersLoaded"; layers: Array<{ id: string; name: string }> };

// ============================================================
// Components <-> Extension
// ============================================================

export type ComponentsToExtensionMessage =
	| { type: "componentsReady" }
	| { type: "addComponent"; objectId: string; componentType: ComponentType }
	| { type: "updateComponent"; objectId: string; componentId: string; updates: Partial<Component> }
	| { type: "removeComponent"; objectId: string; componentId: string }
	| { type: "replaceComponent"; objectId: string; component: Component }
	| { type: "requestConfig" }
	| { type: "requestAtlasRegions"; texturePath: string };

export type ExtensionToComponentsMessage =
	| { type: "showObject"; object: GameObject }
	| { type: "showMultiSelection"; count: number; ids: string[] }
	| { type: "clearSelection" }
	| { type: "sceneUpdate"; scene: Scene }
	| { type: "configLoaded"; config: LibGdxEditorConfigMessage }
	| { type: "configUpdated"; config: LibGdxEditorConfigMessage }
	| { type: "atlasRegionsLoaded"; texturePath: string; atlasPath: string; regions: Array<{ name: string; x: number; y: number; width: number; height: number; rotate: boolean; index: number }> }
	| { type: "atlasNotFound"; texturePath: string };

// ============================================================
// Layers <-> Extension
// ============================================================

export interface ExtensionToLayersMessage {
	type: "showLayers";
	layers: Layer[];
	selectedLayer: string | null;
}

export type LayersToExtensionMessage =
	| { type: "layersReady" }
	| { type: "selectLayer"; name: string }
	| { type: "addLayer" }
	| { type: "deleteLayer"; name: string }
	| { type: "renameLayer"; oldName: string; newName: string }
	| { type: "toggleLayerVisibility"; name: string }
	| { type: "toggleLayerLock"; name: string }
	| { type: "moveLayerUp"; name: string }
	| { type: "moveLayerDown"; name: string }
	| { type: "reorderLayers"; fromIndex: number; toIndex: number };

// ============================================================
// Atlas Protocol
// ============================================================

export interface AtlasRegionsMessage {
	type: "atlasRegionsLoaded";
	texturePath: string;
	atlasPath: string;
	regions: Array<{
		name: string;
		x: number;
		y: number;
		width: number;
		height: number;
		rotate: boolean;
		index: number;
	}>;
}

export interface AtlasNotFoundMessage {
	type: "atlasNotFound";
	texturePath: string;
}
