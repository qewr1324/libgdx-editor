import { app, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { InteractionData } from "../types.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";
import { drawRotateGizmo } from "../selection/gizmo.js";

export function beginRotate(e: any, obj: GameObject): void {
	const rect = app.canvas.getBoundingClientRect();
	const startGlobalX = e.clientX - rect.left;
	const startGlobalY = e.clientY - rect.top;

	if (!viewport) return;
	const startWorld = viewport.toWorld(startGlobalX, startGlobalY);
	const startAngle = Math.atan2(startWorld.y - obj.transform.y, startWorld.x - obj.transform.x);

	const data: InteractionData = {
		startGlobalX,
		startGlobalY,
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

export function handleRotateMove(e: PointerEvent, globalX: number, globalY: number): void {
	const state = require("../state.js") as typeof import("../state.js");
	const data = state.currentInteraction;
	if (!data || !viewport) return;
	const obj = data.primaryObj;
	if (data.rotateStartAngle === undefined || data.rotateStartRotation === undefined || !data.rotateCenter || data.rotateRadius === undefined) return;

	const world = viewport.toWorld(globalX, globalY);
	const center = data.rotateCenter;
	const currentAngle = Math.atan2(world.y - center.y, world.x - center.x);

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

	rerenderObject(obj);
	drawSelectionOutlines();
	drawRotateGizmo(obj, center, data.rotateRadius, world, e.shiftKey, e.altKey);
}
