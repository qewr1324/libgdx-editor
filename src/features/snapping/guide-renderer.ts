// src/features/snapping/guide-renderer.ts
import type { GuideLine } from "./snap-types.js";

/**
 * helpers خالص برای رنگ و موقعیت guide ها.
 * رندر واقعی توی webview انجام می‌شه.
 */

export function hexToNumber(hex: string): number {
	const h = hex.replace("#", "");
	return Number.parseInt(h, 16);
}

export function guideToSegment(g: GuideLine, worldW: number, worldH: number): { x1: number; y1: number; x2: number; y2: number } {
	if (g.axis === "x") {
		return { x1: g.position, y1: 0, x2: g.position, y2: worldH };
	}
	return { x1: 0, y1: g.position, x2: worldW, y2: g.position };
}

export function guidesEqual(a: GuideLine[], b: GuideLine[]): boolean {
	if (a.length !== b.length) return false;
	for (let i = 0; i < a.length; i++) {
		if (a[i].axis !== b[i].axis) return false;
		if (a[i].position !== b[i].position) return false;
	}
	return true;
}
