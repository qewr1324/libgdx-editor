import { Graphics } from "pixi.js";
import { gridLayer, scene } from "../state.js";

export function redrawGrid(): void {
	if (!scene) return;
	gridLayer.removeChildren();

	const gridSize = scene.gridSize || 32;
	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	const g = new Graphics();
	for (let x = 0; x <= worldW; x += gridSize) {
		g.moveTo(x, 0);
		g.lineTo(x, worldH);
	}
	for (let y = 0; y <= worldH; y += gridSize) {
		g.moveTo(0, y);
		g.lineTo(worldW, y);
	}
	g.stroke({ width: 1, color: 0x808080, alpha: 0.5 });

	const border = new Graphics();
	border.rect(0, 0, worldW, worldH);
	border.stroke({ width: 2, color: 0x000080, alpha: 0.9 });

	gridLayer.addChild(g);
	gridLayer.addChild(border);
}
