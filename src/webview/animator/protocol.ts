import type { Animation } from "../../animator/animatorConfig.js";
import type { Scene, GameObject } from "../../types/scene.js";

export type AnimatorMessageToWebview =
	| { type: "loadAnimation"; animation: Animation; filePath: string }
	| { type: "animationUpdated"; animation: Animation }
	| { type: "sceneList"; scenes: Array<{ name: string; uri: string }> }
	| { type: "sceneLoaded"; sceneName: string; sceneUri: string; scene: Scene; objects: ObjectInfo[] }
	| { type: "sceneError"; message: string }
	| { type: "objectList"; objects: ObjectInfo[] }
	| { type: "texturesLoaded"; textures: Record<string, string> };

export type AnimatorMessageFromWebview =
	| { type: "ready" }
	| { type: "save"; animation: Animation }
	| { type: "updateAnimation"; animation: Animation; historyLabel?: string }
	| { type: "updateMetadata"; patch: Partial<Animation> }
	| { type: "requestScene"; sceneName: string }
	| { type: "requestSceneList" }
	| { type: "requestObjectList"; sceneName: string }
	| { type: "changeSourceScene"; sceneName: string }
	| { type: "exportAnimationCode"; animation: Animation };

export interface ObjectInfo {
	id: string;
	name: string;
	type: string;
	zIndex: number;
	texture?: string;
}
