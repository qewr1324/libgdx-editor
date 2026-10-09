// src/features/layers/layer-ops.ts
import type { SceneHost } from "../../editor/scene-types.js";
import { moveObjectToLayerInScene } from "../../editor/scene-mutations.js";
import { log } from "../../shared/logger.js";
import { addLayerToScene, deleteLayerFromScene, moveLayerDownInScene, moveLayerUpInScene, renameLayerInScene, reorderLayersInScene, toggleLayerLockInScene, toggleLayerVisibilityInScene } from "./layer-mutations.js";

/**
 * 🆕 name لایه‌ی جدید رو برمی‌گردونه (نه id).
 * چون LayersProvider با name کار می‌کنه.
 */
export function addLayerOp(host: SceneHost): string | null {
	const scene = host.getScene();
	if (!scene) return null;
	const { scene: updated, newLayerName } = addLayerToScene(scene);
	host.getHistory().commit(updated, "add layer");
	log.debug(`[layers] added "${newLayerName}"`);
	return newLayerName;
}

export function deleteLayerOp(host: SceneHost, name: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = deleteLayerFromScene(scene, name);
	if (updated === scene) return;
	host.getHistory().commit(updated, "delete layer");
}

export function renameLayerOp(host: SceneHost, oldName: string, newName: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = renameLayerInScene(scene, oldName, newName);
	if (updated === scene) return;
	host.getHistory().commit(updated, "rename layer");
}

export function toggleLayerVisibilityOp(host: SceneHost, name: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = toggleLayerVisibilityInScene(scene, name);
	host.getHistory().commit(updated, "toggle layer visibility");
}

export function toggleLayerLockOp(host: SceneHost, name: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = toggleLayerLockInScene(scene, name);
	host.getHistory().commit(updated, "toggle layer lock");
}

export function moveLayerUpOp(host: SceneHost, name: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = moveLayerUpInScene(scene, name);
	if (updated === scene) return;
	host.getHistory().commit(updated, "move layer up");
}

export function moveLayerDownOp(host: SceneHost, name: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = moveLayerDownInScene(scene, name);
	if (updated === scene) return;
	host.getHistory().commit(updated, "move layer down");
}

export function reorderLayersOp(host: SceneHost, fromIndex: number, toIndex: number): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = reorderLayersInScene(scene, fromIndex, toIndex);
	if (updated === scene) return;
	host.getHistory().commit(updated, "reorder layers");
}

/**
 * 🆕 انتقال یک آبجکت به لایه‌ی دیگه
 */
export function moveObjectToLayerOp(host: SceneHost, objectId: string, targetLayerId: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = moveObjectToLayerInScene(scene, objectId, targetLayerId);
	if (updated === scene) return;
	host.getHistory().commit(updated, "move object to layer");
}
