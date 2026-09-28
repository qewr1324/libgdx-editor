import { currentInteraction, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { InteractionData } from "../types.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";
import { drawRotateGizmo } from "../selection/gizmo.js";

export function beginRotate(e: any, obj: GameObject): void {
	if (!viewport) return;

	const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
	const screenX = e.clientX - rect.left;
	const screenY = e.clientY - rect.top;
	const world = viewport.toWorld(screenX, screenY);

	const startAngle = Math.atan2(world.y - obj.transform.y, world.x - obj.transform.x);

	const data: InteractionData = {
		startWorldX: world.x,
		startWorldY: world.y,
		startTransforms: new Map(),
		primaryObj: obj,
		rotateStartAngle: startAngle,
		rotateStartRotation: obj.transform.rotation,
		rotateCenter: { x: obj.transform.x, y: obj.transform.y },
		rotateRadius: Math.max(obj.transform.width, obj.transform.height) / 2 + 40,
	};

	setCurrentInteraction(data);
	setInteractionMode("rotate");
}

export function handleRotateMove(e: PointerEvent, worldX: number, worldY: number): void {
	const data = currentInteraction;
	if (!data || !viewport) return;
	const obj = data.primaryObj;
	if (data.rotateStartAngle === undefined || data.rotateStartRotation === undefined || !data.rotateCenter || data.rotateRadius === undefined) return;

	const center = data.rotateCenter;
	const currentAngle = Math.atan2(worldY - center.y, worldX - center.x);

	let deltaDeg = ((currentAngle - data.rotateStartAngle) * 180) / Math.PI;
	if (deltaDeg > 180) deltaDeg -= 360;
	if (deltaDeg < -180) deltaDeg += 360;

	let newRotation = data.rotateStartRotation + deltaDeg;

	if (e.altKey) {
		newRotation = Math.round(newRotation / 90) * 90;
	} else if (e.shiftKey) {
		newRotation = Math.round(newRotation / 15) * 15;
	}

	newRotation = ((newRotation % 360) + 360) % 360;

	obj.transform.rotation = Math.round(newRotation * 100) / 100;

	const world = { x: worldX, y: worldY };
	rerenderObject(obj);
	drawSelectionOutlines();
	drawRotateGizmo(obj, center, data.rotateRadius, world, e.shiftKey, e.altKey);
}
