import { vscode } from "./types.js";
import { setAnimation, setScene, setSceneName, setObjects, setFilePath } from "./state.js";
import type { AnimatorMessageToWebview } from "./protocol.js";

type LoadCallback = () => void;
type AnimationUpdateCallback = () => void;
type SceneListCallback = (scenes: Array<{ name: string; uri: string }>) => void;

let onLoad: LoadCallback | null = null;
let onAnimationUpdate: AnimationUpdateCallback | null = null;
let onSceneList: SceneListCallback | null = null;

export function setLoadCallback(cb: LoadCallback): void {
	onLoad = cb;
}

export function setAnimationUpdateCallback(cb: AnimationUpdateCallback): void {
	onAnimationUpdate = cb;
}

export function setSceneListCallback(cb: SceneListCallback): void {
	onSceneList = cb;
}

export function setupMessages(): void {
	window.addEventListener("message", (event) => {
		const msg = event.data as AnimatorMessageToWebview;

		switch (msg.type) {
			case "loadAnimation":
				setAnimation(msg.animation);
				setFilePath(msg.filePath);
				onLoad?.();
				break;

			case "animationUpdated":
				setAnimation(msg.animation);
				onAnimationUpdate?.();
				break;

			case "sceneList":
				onSceneList?.(msg.scenes);
				break;

			case "sceneLoaded":
				setScene(msg.scene);
				setSceneName(msg.sceneName);
				setObjects(msg.objects);
				onAnimationUpdate?.();
				break;

			case "objectList":
				setObjects(msg.objects);
				onAnimationUpdate?.();
				break;

			case "sceneError":
				console.error("[Animator] Scene error:", msg.message);
				break;
		}
	});
}

export function postToExtension(msg: unknown): void {
	vscode.postMessage(msg);
}
