import { Container, Graphics, Rectangle, Sprite, Text, TextStyle } from "pixi.js";
import { app, contentLayer, objectSprites, scene, selectedIds, setScene, textureCache } from "../state.js";
import type { GameObject, Scene } from "../../../types/scene.js";
import { redrawGrid } from "./grid.js";
import { beginDrag } from "../interaction/drag.js";
import { selectObjects, drawSelectionOutlines } from "../selection/selection.js";

export function renderScene(newScene: Scene): void {
	setScene(newScene);
	app.renderer.background.color = newScene.backgroundColor || "#1a1a1a";

	contentLayer.removeChildren();
	objectSprites.clear();

	redrawGrid();

	for (const layer of newScene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) {
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
		if (obj.type === "shape") {
			const g = new Graphics();
			const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0xff4a4a;
			g.circle(t.width / 2, t.height / 2, Math.min(t.width, t.height) / 2);
			g.fill({ color, alpha: 1 });
			g.eventMode = "none";
			container.addChild(g);
		} else if (obj.type === "text") {
			const txt = new Text({
				text: obj.name,
				style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
			});
			txt.eventMode = "none";
			container.addChild(txt);
		} else {
			const g = new Graphics();
			const color = obj.color ? parseInt(obj.color.replace("#", "0x")) : 0x4a9eff;
			g.rect(0, 0, t.width, t.height);
			g.fill({ color, alpha: 1 });
			g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
			g.eventMode = "none";
			container.addChild(g);
		}
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
