import type { GameObject, Scene } from "../types/scene.js";

export type WebviewToExtensionMessage =
	| { type: "ready" }
	| { type: "save"; scene: Scene }
	| { type: "sceneChanged"; scene: Scene }
	| { type: "selectObject"; objectId: string | null }
	| {
			type: "requestAddObject";
			objectType: GameObject["type"];
			x: number;
			y: number;
	  };

export type ExtensionToWebviewMessage = { type: "load"; scene: Scene } | { type: "update"; scene: Scene } | { type: "selectObject"; objectId: string | null } | { type: "selectFromOutliner"; objectId: string | null } | { type: "objectUpdated"; object: GameObject };
