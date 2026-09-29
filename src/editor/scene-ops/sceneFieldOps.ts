import type { SceneHost } from "../scene-types.js";
import { updateSceneFieldInScene } from "../scene-mutations.js";

export function updateSceneFieldOp(host: SceneHost, field: string, value: unknown, historyLabel = "update scene"): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = updateSceneFieldInScene(scene, field, value);
	host.getHistory().commit(updated, historyLabel);
}
