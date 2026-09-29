import { vscode } from "./types.js";
import { setAnimation, setScene, setSceneName, setObjects, setFilePath, selectedObjectId, setSelectedObjectId, objects } from "./state.js";
import { loadTexture } from "./render/textures.js";
import type { AnimatorMessageToWebview } from "./protocol.js";

type LoadCallback = () => void;
type AnimationUpdateCallback = () => void;
type SceneListCallback = (scenes: Array<{ name: string; uri: string }>) => void;
type SceneLoadedCallback = () => void;

let onLoad: LoadCallback | null = null;
let onAnimationUpdate: AnimationUpdateCallback | null = null;
let onSceneList: SceneListCallback | null = null;
let onSceneLoaded: SceneLoadedCallback | null = null;

export function setLoadCallback(cb: LoadCallback): void {
	onLoad = cb;
}

export function setAnimationUpdateCallback(cb: AnimationUpdateCallback): void {
	onAnimationUpdate = cb;
}

export function setSceneListCallback(cb: SceneListCallback): void {
	onSceneList = cb;
}

export function setSceneLoadedCallback(cb: SceneLoadedCallback): void {
	onSceneLoaded = cb;
}

export function setupMessages(): void {
	window.addEventListener("message", async (event) => {
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
				// ✅ بعد از اینکه آبجکت‌ها آپدیت شدن، auto-select
				onSceneLoaded?.();
				break;

			case "objectList":
				setObjects(msg.objects);
				onAnimationUpdate?.();
				break;

			case "texturesLoaded": {
				const entries = Object.entries(msg.textures);
				await Promise.all(
					entries.map(async ([path, dataUrl]) => {
						try {
							await loadTexture(path, dataUrl);
						} catch (err) {
							console.error("[Animator] Failed to load texture:", path, err);
						}
					}),
				);
				onAnimationUpdate?.();
				break;
			}

			case "sceneError":
				console.error("[Animator] Scene error:", msg.message);
				break;
		}
	});
}

export function postToExtension(msg: unknown): void {
	vscode.postMessage(msg);
}
