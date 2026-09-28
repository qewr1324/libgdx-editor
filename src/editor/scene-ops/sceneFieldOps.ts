import { SceneRegistry } from "../scene-registry.js";
import { updateSceneFieldInScene } from "../scene-mutations.js";

export function updateSceneFieldOp(field: string, value: unknown, historyLabel = "update scene"): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.getScene();
	if (!scene) return;

	const updated = updateSceneFieldInScene(scene, field, value);
	active.setScene(updated);
	active.markDirty();
	active.pushHistory(updated, historyLabel);
	active.broadcastUpdate(updated);
	active.broadcastHistoryState();
}
