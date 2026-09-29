// src/webview/viewport/features/snapping/guides.ts
import { Graphics } from "pixi.js";
import type { GuideLine } from "../../../../features/snapping/snap-types.js";
import { hexToNumber, guideToSegment } from "../../../../features/snapping/guide-renderer.js";
import { gizmoLayer } from "../../state.js";

let guideGraphics: Graphics | null = null;

export function renderGuides(guides: GuideLine[], worldW: number, worldH: number): void {
	clearGuides();
	if (guides.length === 0) return;

	guideGraphics = new Graphics();

	for (const g of guides) {
		const seg = guideToSegment(g, worldW, worldH);
		guideGraphics.moveTo(seg.x1, seg.y1);
		guideGraphics.lineTo(seg.x2, seg.y2);
	}

	// برای سادگی همه با یک رنگ (اولین guide)
	const color = guides[0] ? hexToNumber(guides[0].color) : 0x00d4ff;
	guideGraphics.stroke({ width: 1, color, alpha: 0.9 });

	gizmoLayer.addChild(guideGraphics);
}

export function clearGuides(): void {
	if (guideGraphics) {
		guideGraphics.destroy();
		guideGraphics = null;
	}
}

export function isGuidesVisible(): boolean {
	return guideGraphics !== null;
}
