import { Graphics } from "pixi.js";
import { app, gizmoLayer, scene, setInteractionMode, viewport } from "../state.js";
import { selectObjects } from "../selection/selection.js";
import { log } from "../../../shared/logger.js";

interface MarqueeState {
	startScreenX: number;
	startScreenY: number;
}

let marqueeGraphic: Graphics | null = null;
let marqueeState: MarqueeState | null = null;
let isMarqueeActive = false;

export function beginMarquee(screenX: number, screenY: number): void {
	if (!viewport) return;

	marqueeState = { startScreenX: screenX, startScreenY: screenY };
	marqueeGraphic = new Graphics();
	gizmoLayer.addChild(marqueeGraphic);
	setInteractionMode("marquee");
	isMarqueeActive = true;
	log.debug("[Marquee] begin", { screenX, screenY });
}

export function updateMarquee(screenX: number, screenY: number): void {
	if (!marqueeState || !marqueeGraphic || !viewport) return;

	const minScreenX = Math.min(marqueeState.startScreenX, screenX);
	const minScreenY = Math.min(marqueeState.startScreenY, screenY);
	const maxScreenX = Math.max(marqueeState.startScreenX, screenX);
	const maxScreenY = Math.max(marqueeState.startScreenY, screenY);

	const topLeft = viewport.toWorld(minScreenX, minScreenY);
	const bottomRight = viewport.toWorld(maxScreenX, maxScreenY);
	const w = bottomRight.x - topLeft.x;
	const h = bottomRight.y - topLeft.y;

	marqueeGraphic.clear();
	marqueeGraphic.rect(topLeft.x, topLeft.y, w, h);
	marqueeGraphic.fill({ color: 0x4aa8ff, alpha: 0.15 });
	marqueeGraphic.stroke({ width: 1, color: 0x4aa8ff, alpha: 0.9 });
}

export function finishMarquee(screenX: number, screenY: number): void {
	if (!marqueeState || !viewport) {
		cancelMarquee();
		return;
	}

	const minScreenX = Math.min(marqueeState.startScreenX, screenX);
	const minScreenY = Math.min(marqueeState.startScreenY, screenY);
	const maxScreenX = Math.max(marqueeState.startScreenX, screenX);
	const maxScreenY = Math.max(marqueeState.startScreenY, screenY);

	const dragDist = Math.hypot(maxScreenX - minScreenX, maxScreenY - minScreenY);
	if (dragDist < 5) {
		cancelMarquee();
		selectObjects([]);
		return;
	}

	const topLeft = viewport.toWorld(minScreenX, minScreenY);
	const bottomRight = viewport.toWorld(maxScreenX, maxScreenY);

	const hits: string[] = [];
	if (scene) {
		for (const layer of scene.layers) {
			if (!layer.visible || layer.locked) continue;
			for (const obj of layer.objects) {
				if (isObjectInRect(obj, topLeft.x, topLeft.y, bottomRight.x, bottomRight.y)) {
					hits.push(obj.id);
				}
			}
		}
	}

	log.debug("[Marquee] finish, hits:", hits.length);
	selectObjects(hits);

	cancelMarquee();
}

export function cancelMarquee(): void {
	if (marqueeGraphic) {
		marqueeGraphic.destroy();
		marqueeGraphic = null;
	}
	marqueeState = null;
	isMarqueeActive = false;
	setInteractionMode("idle");
}

export function isMarqueeInProgress(): boolean {
	return isMarqueeActive;
}

function isObjectInRect(obj: { transform: { x: number; y: number; width: number; height: number; originX: number; originY: number } }, x1: number, y1: number, x2: number, y2: number): boolean {
	const t = obj.transform;
	const left = t.x - t.width * t.originX;
	const top = t.y - t.height * t.originY;
	const right = left + t.width;
	const bottom = top + t.height;

	return !(right < x1 || left > x2 || bottom < y1 || top > y2);
}
