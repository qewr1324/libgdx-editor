import type { ExtensionToWebviewMessage } from "../../protocol/messages.js";
import type { GameObject } from "../../types/scene.js";
import { SceneRegistry } from "../scene-registry.js";
import { duplicateObjectsInScene, deleteObjectFromScene, updateObjectInScene } from "../scene-mutations.js";

export function updateObjectOp(obj: GameObject, historyLabel = "update object"): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.getScene();
	if (!scene) return;

	const updated = updateObjectInScene(scene, obj);
	active.setScene(updated);
	active.markDirty();
	active.pushHistory(updated, historyLabel);
	active.broadcastUpdate(updated);
	active.broadcastHistoryState();
}

export function deleteObjectOp(objectId: string): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.getScene();
	if (!scene) return;

	const updated = deleteObjectFromScene(scene, objectId);
	active.setScene(updated);
	active.markDirty();
	active.pushHistory(updated, "delete object");
	active.broadcastUpdate(updated);
	active.broadcastHistoryState();
}

export function focusObjectOp(objectId: string): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	active.postToWebview({ type: "focusObject", objectId } satisfies ExtensionToWebviewMessage);
}

export function duplicateObjectsOp(objectIds: string[], offsetX: number, offsetY: number): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.getScene();
	if (!scene) return;

	const { scene: updated, newIds } = duplicateObjectsInScene(scene, objectIds, offsetX, offsetY);

	active.setScene(updated);
	active.markDirty();
	active.pushHistory(updated, "duplicate");
	active.broadcastUpdate(updated);
	active.broadcastHistoryState();

	setTimeout(() => {
		active.postToWebview({ type: "selectObjects", objectIds: newIds } satisfies ExtensionToWebviewMessage);
	}, 50);
}
