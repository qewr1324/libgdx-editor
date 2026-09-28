import type { SceneHost } from "../scene-types.js";

export function undoOp(host: SceneHost): void {
	const scene = host.undoHistory();
	if (!scene) return;
	host.setScene(scene);
	host.markDirty();
	host.broadcastUpdate(scene);
	host.broadcastHistoryState();
}

export function redoOp(host: SceneHost): void {
	const scene = host.redoHistory();
	if (!scene) return;
	host.setScene(scene);
	host.markDirty();
	host.broadcastUpdate(scene);
	host.broadcastHistoryState();
}
