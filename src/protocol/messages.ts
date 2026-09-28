import type { GameObject, Scene } from "../types/scene.js";

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
	| { type: "updateSceneField"; field: string; value: unknown }
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

export type InspectorMode = "object" | "scene" | "multi" | "empty";

export type ExtensionToInspectorMessage = { type: "showObject"; object: GameObject } | { type: "showMultiSelection"; count: number; ids: string[] } | { type: "showScene"; scene: Scene } | { type: "showSceneSettings"; scene: Scene } | { type: "clearSelection" } | { type: "switchToSceneMode" };
