import type { GameObject, Layer, Scene } from "../types/scene.js";

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| { type: "save"; scene: Scene }
	| { type: "sceneChanged"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "requestAddObject"; objectType: GameObject["type"]; x: number; y: number }
	| { type: "requestAddTexture"; x: number; y: number }
	| { type: "updateObject"; object: GameObject }
	| { type: "updateObjects"; objects: GameObject[] }
	| { type: "deleteObject"; objectId: string }
	| { type: "deleteObjects"; objectIds: string[] }
	| { type: "requestImportTexture" };

export type ExtensionToWebviewMessage =
	| { type: "load"; scene: Scene }
	| { type: "update"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| { type: "selectObjects"; objectIds: string[] }
	| { type: "selectFromOutliner"; objectId: string | null }
	| { type: "objectUpdated"; object: GameObject }
	| { type: "focusObject"; objectId: string }
	| { type: "texturesLoaded"; textures: Record<string, string> };

export type InspectorToExtensionMessage = { type: "inspectorReady" } | { type: "updateObjectField"; objectId: string; field: string; value: unknown } | { type: "updateSceneField"; field: string; value: unknown } | { type: "deleteObject"; objectId: string } | { type: "focusObject"; objectId: string };

export type ExtensionToInspectorMessage = { type: "showObject"; object: GameObject } | { type: "showMultiSelection"; count: number; ids: string[] } | { type: "showScene"; scene: Scene } | { type: "clearSelection" } | { type: "sceneUpdated"; scene: Scene };

export type LayersToExtensionMessage =
	| { type: "layersReady" }
	| { type: "addLayer" }
	| { type: "deleteLayer"; name: string }
	| { type: "toggleLayerVisibility"; name: string }
	| { type: "toggleLayerLock"; name: string }
	| { type: "renameLayer"; oldName: string; newName: string }
	| { type: "selectLayer"; name: string }
	| { type: "moveLayerUp"; name: string }
	| { type: "moveLayerDown"; name: string };

export type ExtensionToLayersMessage = {
	type: "showLayers";
	layers: Layer[];
	selectedLayer: string | null;
};
