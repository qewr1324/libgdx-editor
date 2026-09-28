import { currentInteraction, objectSprites, scene, selectedIds, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { InteractionData } from "../types.js";
import { findObject } from "../utils/geometry.js";
import { drawSelectionOutlines } from "../selection/selection.js";
import { drawDragGuides } from "../selection/gizmo.js";

export function beginDrag(e: any, primaryObj: GameObject): void {
	if (!viewport) return;

	const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
	const screenX = e.clientX - rect.left;
	const screenY = e.clientY - rect.top;
	const world = viewport.toWorld(screenX, screenY);

	const data: InteractionData = {
		startWorldX: world.x,
		startWorldY: world.y,
		startTransforms: new Map(),
		primaryObj,
	};

	for (const id of selectedIds) {
		const o = scene ? findObject(scene, id) : null;
		if (o) {
			data.startTransforms.set(id, { x: o.transform.x, y: o.transform.y, w: o.transform.width, h: o.transform.height, r: o.transform.rotation });
		}
	}
	if (data.startTransforms.size === 0) {
		data.startTransforms.set(primaryObj.id, { x: primaryObj.transform.x, y: primaryObj.transform.y, w: primaryObj.transform.width, h: primaryObj.transform.height, r: primaryObj.transform.rotation });
	}

	setCurrentInteraction(data);
	setInteractionMode("drag");
}

export function handleDragMove(_e: PointerEvent, worldX: number, worldY: number): void {
	const data = currentInteraction;
	if (!data || !viewport || !scene) return;

	const dx = worldX - data.startWorldX;
	const dy = worldY - data.startWorldY;

	const primaryStart = data.startTransforms.get(data.primaryObj.id)!;
	let newPrimaryX = primaryStart.x + dx;
	let newPrimaryY = primaryStart.y + dy;

	if (scene.snapToGrid) {
		const g = scene.gridSize || 32;
		newPrimaryX = Math.round(newPrimaryX / g) * g;
		newPrimaryY = Math.round(newPrimaryY / g) * g;
	}

	const snapDX = newPrimaryX - (primaryStart.x + dx);
	const snapDY = newPrimaryY - (primaryStart.y + dy);

	for (const [id, start] of data.startTransforms) {
		const obj = findObject(scene, id);
		if (!obj) continue;
		const newX = Math.round(start.x + dx + snapDX);
		const newY = Math.round(start.y + dy + snapDY);
		obj.transform.x = newX;
		obj.transform.y = newY;

		const c = objectSprites.get(id);
		if (c) {
			c.x = newX;
			c.y = newY;
		}
	}

	drawSelectionOutlines();
	drawDragGuides(data.primaryObj);
}
