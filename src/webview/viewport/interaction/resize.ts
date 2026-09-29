import { currentInteraction, scene, setCurrentInteraction, setInteractionMode, viewport } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import type { HandleType, InteractionData } from "../types.js";
import { rerenderObject } from "../render/scene.js";
import { drawSelectionOutlines } from "../selection/selection.js";
import { drawResizeLabel } from "../selection/gizmo.js";
import { getConfig } from "../config-store.js";

export function beginResize(e: any, obj: GameObject, handle: HandleType): void {
	if (!viewport) return;

	const rect = (document.querySelector("canvas") as HTMLCanvasElement).getBoundingClientRect();
	const screenX = e.clientX - rect.left;
	const screenY = e.clientY - rect.top;
	const world = viewport.toWorld(screenX, screenY);

	const data: InteractionData = {
		startWorldX: world.x,
		startWorldY: world.y,
		startTransforms: new Map(),
		primaryObj: obj,
		resizeHandle: handle,
	};

	data.startTransforms.set(obj.id, { x: obj.transform.x, y: obj.transform.y, w: obj.transform.width, h: obj.transform.height, r: obj.transform.rotation });

	setCurrentInteraction(data);
	setInteractionMode("resize");
}

export function handleResizeMove(e: PointerEvent, worldX: number, worldY: number): void {
	const data = currentInteraction;
	if (!data || !viewport || !scene) return;

	const obj = data.primaryObj;
	const handle = data.resizeHandle!;
	const startTransform = data.startTransforms.get(obj.id)!;

	let dx = worldX - data.startWorldX;
	let dy = worldY - data.startWorldY;

	// ✅ در object mode، delta رو به محور محلی آبجکت تبدیل می‌کنیم
	const isObjectMode = getConfig()?.gizmo.mode === "object";
	if (isObjectMode && startTransform.r !== 0) {
		const rad = (startTransform.r * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		// rotation برعکس برای برگردوندن به محور محلی
		const localDx = dx * cos + dy * sin;
		const localDy = -dx * sin + dy * cos;
		dx = localDx;
		dy = localDy;
	}

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

	// ✅ در object mode، موقعیت جدید رو باید به محور جهانی برگردونیم
	if (isObjectMode && startTransform.r !== 0) {
		// delta موقعیت رو در محور محلی حساب کردیم، حالا برگردون به جهانی
		const offsetX = newX - startTransform.x;
		const offsetY = newY - startTransform.y;
		const rad = (startTransform.r * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const globalOffsetX = offsetX * cos - offsetY * sin;
		const globalOffsetY = offsetX * sin + offsetY * cos;
		newX = startTransform.x + globalOffsetX;
		newY = startTransform.y + globalOffsetY;
	}

	obj.transform.width = Math.round(newW);
	obj.transform.height = Math.round(newH);
	obj.transform.x = Math.round(newX);
	obj.transform.y = Math.round(newY);

	rerenderObject(obj);
	drawSelectionOutlines();
	drawResizeLabel(obj);
}
