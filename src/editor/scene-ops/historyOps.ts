import { SceneRegistry } from "../scene-registry.js";
import type { Scene } from "../../types/scene.js";
import { findObject } from "../utils/geometry.js";

function validateSelection(scene: Scene): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;

	// انتخاب فعلی در Inspector را بگیر (از طریق رویداد قبلی)
	// چون selection در SceneRegistry نگه‌داری نمی‌شود، اینجا فقط
	// یک رویداد selection خالی می‌فرستیم اگر Inspector مطلع باشد.
	// Inspector خودش با findObject چک می‌کند.
}

export function undoOp(): void {
	const active = SceneRegistry.getActiveInstance();
	if (!active) return;
	const scene = active.undoHistory();
	if (!scene) return;
	active.setScene(scene);
	active.markDirty();
	active.broadcastUpdate(scene);
	active.broadcastHistoryState();
	// ✅ اگر آبجکت انتخاب‌شده وجود ندارد، Inspector خودش clearSelection می‌کند
	// (این کار در InspectorProvider.findObject انجام می‌شود)
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
