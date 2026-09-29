import { app, currentInteraction, interactionMode, isFinishingInteraction, scene, setIsFinishingInteraction, setInteractionMode, setCurrentInteraction, viewport } from "../state.js";
import { handleDragMove } from "./drag.js";
import { handleResizeMove } from "./resize.js";
import { handleRotateMove } from "./rotate.js";
import { clearGizmo } from "../selection/gizmo.js";
import { vscode } from "../types.js";
import type { GameObject } from "../../../types/scene.js";
import { findObject } from "../utils/geometry.js";

export function setupGlobalInteractionListeners(): void {
	window.addEventListener("pointermove", (e) => {
		if (interactionMode === "marquee") return;
		if (interactionMode === "idle" || !currentInteraction || !scene || !viewport) return;

		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		const world = viewport.toWorld(screenX, screenY);

		switch (interactionMode) {
			case "drag":
				handleDragMove(e, world.x, world.y);
				break;
			case "resize":
				handleResizeMove(e, world.x, world.y);
				break;
			case "rotate":
				handleRotateMove(e, world.x, world.y);
				break;
		}
	});

	window.addEventListener("pointerup", () => {
		if (interactionMode === "marquee") return;
		finishInteractionSafely();
	});
	window.addEventListener("pointercancel", () => {
		if (interactionMode === "marquee") return;
		finishInteractionSafely();
	});
}

export function finishInteractionSafely(): void {
	if (isFinishingInteraction) return;
	if (interactionMode === "idle") return;
	if (interactionMode === "marquee") return;

	setIsFinishingInteraction(true);

	try {
		finishInteraction();
	} finally {
		setTimeout(() => {
			setIsFinishingInteraction(false);
		}, 0);
	}
}

import { flushPendingRender } from "../messages.js";

export function finishInteraction(): void {
	if (!currentInteraction) {
		setInteractionMode("idle");
		return;
	}

	const data = currentInteraction;
	const mode = interactionMode;

	setInteractionMode("idle");
	setCurrentInteraction(null);
	clearGizmo();

	if (!scene) {
		flushPendingRender();
		return;
	}

	if (mode === "drag") {
		const updated: GameObject[] = [];
		for (const id of data.startTransforms.keys()) {
			const obj = findObject(scene, id);
			if (obj) updated.push(structuredClone(obj) as GameObject);
		}
		if (updated.length > 0) {
			vscode.postMessage({ type: "updateObjects", objects: updated, historyLabel: "move" });
		}
	} else if (mode === "resize") {
		vscode.postMessage({
			type: "updateObject",
			object: structuredClone(data.primaryObj) as GameObject,
			historyLabel: "resize",
		});
	} else if (mode === "rotate") {
		vscode.postMessage({
			type: "updateObject",
			object: structuredClone(data.primaryObj) as GameObject,
			historyLabel: "rotate",
		});
	}

	flushPendingRender();
}
