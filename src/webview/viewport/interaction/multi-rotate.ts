import { currentInteraction, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";

export function beginMultiRotate(e: PointerEvent, objects: GameObject[], center: { cx: number; cy: number }): void {
	if (!viewport) return;

	const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);

	const startAngle = Math.atan2(world.y - center.cy, world.x - center.cx);

	const data: any = {
		startWorldX: world.x,
		startWorldY: world.y,
		startTransforms: new Map(),
		primaryObj: objects[0],
		rotateStartAngle: startAngle,
		rotateStartRotation: 0,
		rotateCenter: { x: center.cx, y: center.cy },
		multiObjects: objects,
		multiCenter: center,
	};

	for (const obj of objects) {
		data.startTransforms.set(obj.id, {
			x: obj.transform.x,
			y: obj.transform.y,
			w: obj.transform.width,
			h: obj.transform.height,
			r: obj.transform.rotation,
		});
	}

	setCurrentInteraction(data);
	setInteractionMode("rotate");
}

export function handleMultiRotateMove(e: PointerEvent, worldX: number, worldY: number): void {
	const data: any = currentInteraction;
	if (!data || !viewport) return;
	if (!data.multiObjects || !data.multiCenter) return;

	const center = data.multiCenter;
	const currentAngle = Math.atan2(worldY - center.cy, worldX - center.cx);

	let deltaDeg = ((currentAngle - data.rotateStartAngle) * 180) / Math.PI;
	if (deltaDeg > 180) deltaDeg -= 360;
	if (deltaDeg < -180) deltaDeg += 360;

	if (e.altKey) {
		deltaDeg = Math.round(deltaDeg / 90) * 90;
	} else if (e.shiftKey) {
		deltaDeg = Math.round(deltaDeg / 15) * 15;
	}

	const rad = (deltaDeg * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);

	for (const obj of data.multiObjects) {
		const start = data.startTransforms.get(obj.id)!;

		const ox = start.x - center.cx;
		const oy = start.y - center.cy;
		const rx = ox * cos - oy * sin;
		const ry = ox * sin + oy * cos;

		obj.transform.x = Math.round(center.cx + rx);
		obj.transform.y = Math.round(center.cy + ry);
		obj.transform.rotation = start.r + deltaDeg;
		obj.transform.rotation = ((obj.transform.rotation % 360) + 360) % 360;
	}

	for (const obj of data.multiObjects) {
		rerenderObject(obj);
	}
	drawSelectionOutlines();
}
