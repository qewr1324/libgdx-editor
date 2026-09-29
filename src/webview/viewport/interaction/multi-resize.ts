import { currentInteraction, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { HandleType } from "../types.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";

interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

export function beginMultiResize(e: PointerEvent, objects: GameObject[], handle: HandleType, bounds: Bounds): void {
	if (!viewport) return;

	const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
	const world = viewport.toWorld(e.clientX - rect.left, e.clientY - rect.top);

	const data: any = {
		startWorldX: world.x,
		startWorldY: world.y,
		startTransforms: new Map(),
		primaryObj: objects[0],
		resizeHandle: handle,
		multiBounds: bounds,
		multiObjects: objects,
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
	setInteractionMode("resize");
}

export function handleMultiResizeMove(_e: PointerEvent, worldX: number, worldY: number): void {
	const data: any = currentInteraction;
	if (!data || !viewport) return;
	if (!data.multiBounds || !data.multiObjects) return;

	const bounds: Bounds = data.multiBounds;
	const handle: HandleType = data.resizeHandle!;

	const dx = worldX - data.startWorldX;
	const dy = worldY - data.startWorldY;

	const isLeft = handle === "w" || handle === "nw" || handle === "sw";
	const isRight = handle === "e" || handle === "ne" || handle === "se";
	const isTop = handle === "n" || handle === "nw" || handle === "ne";
	const isBottom = handle === "s" || handle === "sw" || handle === "se";

	const boundsW = bounds.maxX - bounds.minX;
	const boundsH = bounds.maxY - bounds.minY;

	let scaleX = 1;
	let scaleY = 1;

	if (isRight) {
		scaleX = (boundsW + dx) / boundsW;
	} else if (isLeft) {
		scaleX = (boundsW - dx) / boundsW;
	}

	if (isBottom) {
		scaleY = (boundsH + dy) / boundsH;
	} else if (isTop) {
		scaleY = (boundsH - dy) / boundsH;
	}

	scaleX = Math.max(0.01, scaleX);
	scaleY = Math.max(0.01, scaleY);

	const anchorX = isRight ? bounds.minX : isLeft ? bounds.maxX : bounds.minX + boundsW / 2;
	const anchorY = isBottom ? bounds.minY : isTop ? bounds.maxY : bounds.minY + boundsH / 2;

	for (const obj of data.multiObjects) {
		const start = data.startTransforms.get(obj.id)!;

		const newX = anchorX + (start.x - anchorX) * scaleX;
		const newY = anchorY + (start.y - anchorY) * scaleY;
		const newW = Math.max(1, start.w * scaleX);
		const newH = Math.max(1, start.h * scaleY);

		obj.transform.x = Math.round(newX);
		obj.transform.y = Math.round(newY);
		obj.transform.width = Math.round(newW);
		obj.transform.height = Math.round(newH);
	}

	for (const obj of data.multiObjects) {
		rerenderObject(obj);
	}
	drawSelectionOutlines();
}
