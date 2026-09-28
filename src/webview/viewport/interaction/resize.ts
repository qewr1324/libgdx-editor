import { app, scene, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { InteractionData, HandleType } from "../types.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";
import { drawResizeLabel } from "../selection/gizmo.js";

export function beginResize(e: any, obj: GameObject, handle: HandleType): void {
	const rect = app.canvas.getBoundingClientRect();
	const data: InteractionData = {
		startGlobalX: e.clientX - rect.left,
		startGlobalY: e.clientY - rect.top,
		startTransforms: new Map(),
		primaryObj: obj,
		resizeHandle: handle,
	};

	data.startTransforms.set(obj.id, { x: obj.transform.x, y: obj.transform.y, w: obj.transform.width, h: obj.transform.height, r: obj.transform.rotation });

	setCurrentInteraction(data);
	setInteractionMode("resize");
}

export function handleResizeMove(e: PointerEvent, globalX: number, globalY: number): void {
	const state = require("../state.js") as typeof import("../state.js");
	const data = state.currentInteraction;
	if (!data || !viewport || !scene) return;

	const obj = data.primaryObj;
	const handle = data.resizeHandle!;
	const startTransform = data.startTransforms.get(obj.id)!;

	const dx = (globalX - data.startGlobalX) / viewport.scale.x;
	const dy = (globalY - data.startGlobalY) / viewport.scale.y;

	const shift = e.shiftKey;
	const alt = e.altKey;

	let newW = startTransform.w;
	let newH = startTransform.h;
	let newX = startTransform.x;
	let newY = startTransform.y;

	const isLeft = handle === "w" || handle === "nw" || handle === "sw";
	const isRight = handle === "e" || handle === "ne" || handle === "se";
	const isTop = handle === "n" || handle === "nw" || handle === "ne";
	const isBottom = handle === "s" || handle === "sw" || handle === "se";
	const isHorizontal = isLeft || isRight;
	const isVertical = isTop || isBottom;

	if (alt) {
		if (isHorizontal) {
			newW = Math.max(1, startTransform.w + (isRight ? dx * 2 : -dx * 2));
		}
		if (isVertical) {
			newH = Math.max(1, startTransform.h + (isBottom ? dy * 2 : -dy * 2));
		}
	} else {
		if (isRight) {
			newW = Math.max(1, startTransform.w + dx);
			newX = startTransform.x + dx / 2;
		} else if (isLeft) {
			newW = Math.max(1, startTransform.w - dx);
			newX = startTransform.x + dx / 2;
		}

		if (isBottom) {
			newH = Math.max(1, startTransform.h + dy);
			newY = startTransform.y + dy / 2;
		} else if (isTop) {
			newH = Math.max(1, startTransform.h - dy);
			newY = startTransform.y + dy / 2;
		}

		if (!isHorizontal) newX = startTransform.x;
		if (!isVertical) newY = startTransform.y;
	}

	if (shift && isHorizontal && isVertical) {
		const aspect = startTransform.w / startTransform.h;
		if (newW / newH > aspect) {
			newW = newH * aspect;
		} else {
			newH = newW / aspect;
		}
	}

	if (scene.snapToGrid) {
		const g = scene.gridSize || 32;
		newW = Math.round(newW / g) * g;
		newH = Math.round(newH / g) * g;
	}

	obj.transform.width = Math.round(newW);
	obj.transform.height = Math.round(newH);
	obj.transform.x = Math.round(newX);
	obj.transform.y = Math.round(newY);

	rerenderObject(obj);
	drawSelectionOutlines();
	drawResizeLabel(obj);
}
