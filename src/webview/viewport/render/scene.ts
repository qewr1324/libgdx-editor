import { Container, Graphics, Rectangle, Sprite, Text, TextStyle } from "pixi.js";
import { app, contentLayer, objectSprites, scene, selectedIds, setScene, textureCache, interactionMode, getBrokenAssets } from "../state.js";
import type { GameObject, Scene } from "../../../types/scene.js";
import { sortObjectsByZIndex } from "../../../types/scene.js";
import type { ShapeType } from "../../../config/config-types.js";
import { redrawGrid } from "./grid.js";
import { beginDrag } from "../interaction/drag.js";
import { selectObjects, drawSelectionOutlines } from "../selection/selection.js";
import { findObject } from "../utils/geometry.js";
import { getConfig } from "../config-store.js";

export function renderScene(newScene: Scene): void {
	setScene(newScene);

	if (interactionMode !== "idle") {
		return;
	}

	app.renderer.background.color = newScene.backgroundColor || "#1a1a1a";

	contentLayer.removeChildren();
	objectSprites.clear();

	redrawGrid();

	for (const layer of newScene.layers) {
		if (!layer.visible) continue;
		const sorted = sortObjectsByZIndex(layer.objects);
		for (const obj of sorted) {
			renderObject(obj, layer.locked ?? false);
		}
	}

	if (selectedIds.length > 0) {
		drawSelectionOutlines();
	}
}

export function renderObject(obj: GameObject, layerLocked = false): void {
	const container = new Container();
	const t = obj.transform;

	const isWireframe = getConfig()?.view.renderMode === "wireframe";
	const broken = getBrokenAssets();
	let rendered = false;

	if (obj.type === "sprite" && obj.texture) {
		const cached = textureCache.get(obj.texture);
		if (cached) {
			const sprite = new Sprite(cached);
			sprite.width = t.width;
			sprite.height = t.height;
			sprite.eventMode = "none";
			container.addChild(sprite);
			rendered = true;
		}
	}

	if (!rendered) {
		const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x4a9eff;
		const g = new Graphics();

		if (obj.type === "shape") {
			const shapeType = (obj.properties?.shapeType as ShapeType) ?? "rectangle";
			drawShape(g, shapeType, t.width, t.height);
		} else if (obj.type === "text") {
			const txt = new Text({
				text: obj.name,
				style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
			});
			txt.eventMode = "none";
			container.addChild(txt);
			rendered = true;
		} else {
			g.rect(0, 0, t.width, t.height);
		}

		if (obj.type === "shape" || (!rendered && obj.type !== "text")) {
			if (isWireframe) {
				g.stroke({ width: 2, color, alpha: 1 });
			} else {
				g.fill({ color, alpha: 1 });
				g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
			}
			g.eventMode = "none";
			container.addChild(g);
		}
	}

	if (obj.texture && broken.includes(obj.texture)) {
		const badge = new Text({
			text: "❗",
			style: new TextStyle({ fontSize: 18, fill: "#ff4a4a", stroke: { color: 0x000000, width: 3 } }),
		});
		badge.x = 2;
		badge.y = 2;
		badge.eventMode = "none";
		container.addChild(badge);
	}

	container.hitArea = new Rectangle(0, 0, t.width, t.height);
	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);

	container.eventMode = "static";
	container.cursor = layerLocked ? "not-allowed" : "pointer";

	if (!layerLocked) {
		container.on("pointerdown", (e) => {
			e.stopPropagation();

			const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

			if (isMulti) {
				const idx = selectedIds.indexOf(obj.id);
				if (idx !== -1) {
					selectObjects(selectedIds.filter((id) => id !== obj.id));
				} else {
					selectObjects([...selectedIds, obj.id], obj.id);
				}
			} else {
				if (!selectedIds.includes(obj.id)) {
					selectObjects([obj.id], obj.id);
				}
			}

			beginDrag(e, obj);
		});
	}

	contentLayer.addChild(container);
	objectSprites.set(obj.id, container);
}

function drawShape(g: Graphics, shapeType: ShapeType, width: number, height: number): void {
	const cx = width / 2;
	const cy = height / 2;
	const r = Math.min(width, height) / 2;
	const rx = width / 2;
	const ry = height / 2;

	switch (shapeType) {
		case "rectangle":
			g.rect(0, 0, width, height);
			break;

		case "circle":
			g.ellipse(cx, cy, rx, ry);
			break;

		case "triangle": {
			g.moveTo(cx, 0);
			g.lineTo(width, height);
			g.lineTo(0, height);
			g.closePath();
			break;
		}

		case "diamond": {
			g.moveTo(cx, 0);
			g.lineTo(width, cy);
			g.lineTo(cx, height);
			g.lineTo(0, cy);
			g.closePath();
			break;
		}

		case "pentagon": {
			drawPolygon(g, cx, cy, r, 5, -Math.PI / 2);
			break;
		}

		case "hexagon": {
			drawPolygon(g, cx, cy, r, 6, 0);
			break;
		}

		case "star": {
			drawStar(g, cx, cy, r, r * 0.45, 5, -Math.PI / 2);
			break;
		}

		default:
			g.rect(0, 0, width, height);
	}
}

function drawPolygon(g: Graphics, cx: number, cy: number, r: number, sides: number, startAngle: number): void {
	for (let i = 0; i < sides; i++) {
		const angle = startAngle + (i * 2 * Math.PI) / sides;
		const x = cx + Math.cos(angle) * r;
		const y = cy + Math.sin(angle) * r;
		if (i === 0) g.moveTo(x, y);
		else g.lineTo(x, y);
	}
	g.closePath();
}

function drawStar(g: Graphics, cx: number, cy: number, outerR: number, innerR: number, points: number, startAngle: number): void {
	for (let i = 0; i < points * 2; i++) {
		const r = i % 2 === 0 ? outerR : innerR;
		const angle = startAngle + (i * Math.PI) / points;
		const x = cx + Math.cos(angle) * r;
		const y = cy + Math.sin(angle) * r;
		if (i === 0) g.moveTo(x, y);
		else g.lineTo(x, y);
	}
	g.closePath();
}

export function rerenderObject(obj: GameObject): void {
	const old = objectSprites.get(obj.id);
	if (old) {
		contentLayer.removeChild(old);
		old.destroy({ children: true });
		objectSprites.delete(obj.id);
	}
	const layer = scene?.layers.find((l) => l.objects.some((o) => o.id === obj.id));
	renderObject(obj, layer?.locked ?? false);
}
