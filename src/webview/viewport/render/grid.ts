import { Graphics } from "pixi.js";
import { gridLayer, scene } from "../state.js";
import { getConfig } from "../config-store.js";

export function redrawGrid(): void {
	if (!scene) return;
	gridLayer.removeChildren();

	const config = getConfig();
	const showGrid = config?.view.showGrid !== false;
	const showBorder = config?.view.showWorldBorder !== false;

	if (!showGrid && !showBorder) return;

	const gridSize = scene.gridSize || 32;
	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	if (showGrid) {
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
		gridLayer.addChild(g);
	}

	if (showBorder) {
		const border = new Graphics();
		border.rect(0, 0, worldW, worldH);
		border.stroke({ width: 2, color: 0x000080, alpha: 0.9 });
		gridLayer.addChild(border);
	}
}
