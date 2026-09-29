import { Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { getLayers } from "./pixi-setup.js";
import { animation, scene, currentTime } from "../state.js";
import { sampleAnimation } from "../../../animator/animatorController.js";
import type { GameObject } from "../../../types/scene.js";
import type { ShapeType } from "../../../config/config-types.js";

let textureCache = new Map<string, Texture>();
const spriteCache = new Map<string, Container>();

export function clearPreview(): void {
	const l = getLayers();
	if (!l) return;
	l.contentLayer.removeChildren();
	spriteCache.clear();
}

/**
 * صحنه رو در زمان مشخص رندر می‌کنه.
 */
export function renderAtTime(timeMs: number): void {
	const l = getLayers();
	if (!l || !scene) return;

	const samples = animation ? sampleAnimation(animation, timeMs) : new Map();

	// پاک کردن کش sprite اگه صحنه عوض شده
	l.contentLayer.removeChildren();
	spriteCache.clear();

	// مرتب‌سازی بر اساس zIndex
	const allObjects: GameObject[] = [];
	for (const layer of scene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) allObjects.push(obj);
	}
	allObjects.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

	for (const obj of allObjects) {
		const container = renderObjectWithOverrides(obj, samples);
		if (container) {
			l.contentLayer.addChild(container);
			spriteCache.set(obj.id, container);
		}
	}
}

function renderObjectWithOverrides(obj: GameObject, samples: Map<string, number | string | boolean>): Container | null {
	// کپی از transform
	const t = { ...obj.transform };

	for (const [key, value] of samples) {
		const [objectId, property] = key.split("::");
		if (objectId !== obj.id) continue;

		if (property.startsWith("transform.")) {
			const prop = property.slice("transform.".length) as keyof typeof t;
			if (typeof value === "number") {
				t[prop] = value as never;
			}
		}
	}

	const container = new Container();

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
			container.addChild(txt);
			rendered = true;
		} else {
			g.rect(0, 0, t.width, t.height);
		}

		if (!rendered) {
			g.fill({ color, alpha: 1 });
			g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
			g.eventMode = "none";
			container.addChild(g);
		}
	}

	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);

	return container;
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
		case "triangle":
			g.moveTo(cx, 0);
			g.lineTo(width, height);
			g.lineTo(0, height);
			g.closePath();
			break;
		case "diamond":
			g.moveTo(cx, 0);
			g.lineTo(width, cy);
			g.lineTo(cx, height);
			g.lineTo(0, cy);
			g.closePath();
			break;
		case "pentagon":
			drawPolygon(g, cx, cy, r, 5, -Math.PI / 2);
			break;
		case "hexagon":
			drawPolygon(g, cx, cy, r, 6, 0);
			break;
		case "star":
			drawStar(g, cx, cy, r, r * 0.45, 5, -Math.PI / 2);
			break;
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

export function setTexture(path: string, texture: Texture): void {
	textureCache.set(path, texture);
}
