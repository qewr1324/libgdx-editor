import { Graphics } from "pixi.js";
import type { GameObject, Scene } from "../../../types/scene.js";

/**
 * خط خط‌چین رسم می‌کند.
 */
export function drawDashedLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number): void {
	const dx = x2 - x1;
	const dy = y2 - y1;
	const len = Math.sqrt(dx * dx + dy * dy);
	if (len === 0) return;
	const ux = dx / len;
	const uy = dy / len;

	let pos = 0;
	while (pos < len) {
		const startX = x1 + ux * pos;
		const startY = y1 + uy * pos;
		const endPos = Math.min(pos + dashLen, len);
		const endX = x1 + ux * endPos;
		const endY = y1 + uy * endPos;
		g.moveTo(startX, startY);
		g.lineTo(endX, endY);
		pos += dashLen + gapLen;
	}
}

/**
 * آبجکت را با id پیدا می‌کند.
 */
export function findObject(s: Scene, id: string): GameObject | null {
	for (const layer of s.layers) {
		for (const obj of layer.objects) {
			if (obj.id === id) return obj;
		}
	}
	return null;
}
