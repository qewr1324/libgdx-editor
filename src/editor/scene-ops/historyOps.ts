import type { SceneHost } from "../scene-types.js";

export function undoOp(host: SceneHost): void {
	host.getHistory().undo();
}

export function redoOp(host: SceneHost): void {
	host.getHistory().redo();
}
