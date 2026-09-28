import { SceneRegistry } from "../scene-registry.js";

export function undoOp(): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.undoHistory();
	if (!scene) return;
	active.setScene(scene);
	active.markDirty();
	active.broadcastUpdate(scene);
	active.broadcastHistoryState();
}

export function redoOp(): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.redoHistory();
	if (!scene) return;
	active.setScene(scene);
	active.markDirty();
	active.broadcastUpdate(scene);
	active.broadcastHistoryState();
}
