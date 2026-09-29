import { Container, Graphics, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { getLayers } from "./pixi-setup.js";
import { animation, scene } from "../state.js";
import { sampleAnimation } from "../../../animator/animatorController.js";
import type { GameObject } from "../../../types/scene.js";
import type { ShapeType } from "../../../config/config-types.js";

const textureCache = new Map<string, Texture>();
// ✅ کش container برای هر آبجکت — هر فریم فقط پراپرتی‌ها آپدیت می‌شن
const containerCache = new Map<string, Container>();

export function clearPreview(): void {
	const l = getLayers();
	if (!l) return;
	l.contentLayer.removeChildren();
	for (const container of containerCache.values()) {
		container.destroy({ children: true });
	}
	containerCache.clear();
}

/**
 * صحنه رو در زمان مشخص رندر می‌کنه.
 * - اگه ساختار صحنه عوض شده باشه (تعداد/آی‌دی آبجکت‌ها)، کش بازسازی می‌شه
 * - در غیر این صورت، فقط property ها آپدیت می‌شن
 */
export function renderAtTime(timeMs: number): void {
	const l = getLayers();
	if (!l || !scene) return;

	const samples = animation ? sampleAnimation(animation, timeMs) : new Map();

	// آبجکت‌های قابل نمایش، مرتب‌شده بر اساس zIndex
	const allObjects: GameObject[] = [];
	for (const layer of scene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) allObjects.push(obj);
	}
	allObjects.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

	// ✅ چک کن آیا ساختار عوض شده
	const sceneStructureChanged = allObjects.length !== containerCache.size || allObjects.some((o) => !containerCache.has(o.id));

	if (sceneStructureChanged) {
		rebuildContainers(allObjects);
	}

	// ✅ فقط آپدیت کن — نه بازسازی
	for (const obj of allObjects) {
		const container = containerCache.get(obj.id);
		if (!container) continue;
		applyOverrides(container, obj, samples);
	}
}

/**
 * ساخت مجدد همه container ها (فقط وقتی ساختار صحنه عوض شده)
 */
function rebuildContainers(allObjects: GameObject[]): void {
	const l = getLayers();
	if (!l) return;

	l.contentLayer.removeChildren();
	for (const container of containerCache.values()) {
		container.destroy({ children: true });
	}
	containerCache.clear();

	for (const obj of allObjects) {
		const container = buildObject(obj);
		if (container) {
			l.contentLayer.addChild(container);
			containerCache.set(obj.id, container);
		}
	}
}

/**
 * ساخت container برای یک آبجکت از صفر
 */
function buildObject(obj: GameObject): Container | null {
	const container = new Container();
	const t = obj.transform;

	let rendered = false;

	// --- sprite ---
	if (obj.type === "sprite" && obj.texture) {
		const cached = textureCache.get(obj.texture);
		if (cached) {
			const sprite = new Sprite(cached);
			sprite.width = t.width;
			sprite.height = t.height;
			sprite.eventMode = "none";
			sprite.label = "sprite";
			container.addChild(sprite);
			rendered = true;
		}
	}

	// --- text ---
	if (!rendered && obj.type === "text") {
		const txt = new Text({
			text: obj.name,
			style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
		});
		txt.eventMode = "none";
		txt.label = "text";
		container.addChild(txt);
		rendered = true;
	}

	// --- shape / fallback ---
	if (!rendered) {
		const color = obj.color ? Number.parseInt(obj.color.replace("#", "0x"), 16) : 0x4a9eff;
		const g = new Graphics();

		if (obj.type === "shape") {
			const shapeType = (obj.properties?.shapeType as ShapeType) ?? "rectangle";
			drawShape(g, shapeType, t.width, t.height);
		} else {
			g.rect(0, 0, t.width, t.height);
		}

		g.fill({ color, alpha: 1 });
		g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
		g.eventMode = "none";
		g.label = "shape";
		container.addChild(g);
	}

	applyTransform(container, obj);
	return container;
}

/**
 * اعمال transform فعلی آبجکت روی container
 */
function applyTransform(container: Container, obj: GameObject): void {
	const t = obj.transform;
	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);
}

/**
 * اعمال مقادیر keyframe ها روی container
 */
function applyOverrides(container: Container, obj: GameObject, samples: Map<string, number | string | boolean>): void {
	const t = { ...obj.transform };
	let color = obj.color;
	let alpha = 1;
	let visible = true;

	for (const [key, value] of samples) {
		const sep = key.indexOf("::");
		if (sep === -1) continue;
		const objectId = key.slice(0, sep);
		const property = key.slice(sep + 2);
		if (objectId !== obj.id) continue;

		if (property.startsWith("transform.")) {
			const prop = property.slice("transform.".length) as keyof typeof t;
			if (typeof value === "number") {
				(t as Record<string, unknown>)[prop] = value;
			}
		} else if (property === "color" && typeof value === "string") {
			color = value;
		} else if (property === "opacity" && typeof value === "number") {
			alpha = value;
		} else if (property === "visible" && typeof value === "boolean") {
			visible = value;
		}
	}

	// transform
	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);
	container.pivot.set(t.width * t.originX, t.height * t.originY);

	// ✅ اندازه sprite رو هم آپدیت کن
	for (const child of container.children) {
		if (child.label === "sprite" && child instanceof Sprite) {
			child.width = t.width;
			child.height = t.height;
		} else if (child.label === "shape" && child instanceof Graphics) {
			// shape رو نمی‌تونیم به‌راحتی ری‌سایز کنیم بدون بازسازی
			// ولی چون pivot و scale آپدیت می‌شن، به‌قدر کافی خوبه
			child.tint = color ? Number.parseInt(color.replace("#", "0x"), 16) : 0xffffff;
		} else if (child.label === "text" && child instanceof Text) {
			if (color) child.style.fill = color;
		}
	}

	// ✅ opacity و visible
	container.alpha = alpha;
	container.visible = visible;
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
	// ✅ اگه تکسچر جدید اومد، container ها رو invalidate کن که دفعه بعد بازسازی شن
	containerCache.clear();
}
