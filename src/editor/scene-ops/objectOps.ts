import type { ExtensionToWebviewMessage } from "../../protocol/messages.js";
import type { GameObject } from "../../types/scene.js";
import type { SceneHost } from "../scene-types.js";
import { duplicateObjectsInScene, deleteObjectFromScene, updateObjectInScene } from "../scene-mutations.js";

export function updateObjectOp(host: SceneHost, obj: GameObject, historyLabel = "update object"): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = updateObjectInScene(scene, obj);
	host.getHistory().commit(updated, historyLabel);
}

export function deleteObjectOp(host: SceneHost, objectId: string): void {
	const scene = host.getScene();
	if (!scene) return;
	const updated = deleteObjectFromScene(scene, objectId);
	host.getHistory().commit(updated, "delete object");
}

export function focusObjectOp(host: SceneHost, objectId: string): void {
	host.postToWebview({ type: "focusObject", objectId } satisfies ExtensionToWebviewMessage);
}

export function duplicateObjectsOp(host: SceneHost, objectIds: string[], offsetX: number, offsetY: number): void {
	const scene = host.getScene();
	if (!scene) return;
	const { scene: updated, newIds } = duplicateObjectsInScene(scene, objectIds, offsetX, offsetY);

	host.getHistory().commit(updated, "duplicate");

	setTimeout(() => {
		host.postToWebview({ type: "selectObjects", objectIds: newIds } satisfies ExtensionToWebviewMessage);
	}, 50);
}
