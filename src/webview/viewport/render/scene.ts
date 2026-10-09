// src/webview/viewport/render/scene.ts
import { Container, Graphics, Rectangle, Sprite, Text, TextStyle, Texture } from "pixi.js";
import { app, contentLayer, objectSprites, scene, selectedIds, setScene, textureCache, interactionMode, getBrokenAssets } from "../state.js";
import type { GameObject, Scene } from "../../../types/scene.js";
import { sortObjectsByZIndex } from "../../../types/scene.js";
import type { Component, ShapeType } from "../../../types/components.js";
import { findComponent } from "../../../types/components.js";
import { getAtlasProperties } from "../../../features/texture-atlas/atlas-properties.js";
import { resolveFrameRects } from "../../../features/texture-atlas/atlas-grid.js";
import { getAtlas as getAtlasFromCache } from "../features/texture-atlas/atlas-picker.js";
import { redrawGrid } from "./grid.js";
import { beginDrag } from "../interaction/drag.js";
import { selectObjects, drawSelectionOutlines } from "../selection/selection.js";
import { getConfig } from "../config-store.js";

// ============================================================
// Sub-texture cache
// ============================================================

const subTextureCache = new Map<string, Texture>();

function getSubTexture(texturePath: string, region: { x: number; y: number; width: number; height: number; rotate?: boolean }): Texture | null {
	const cacheKey = `${texturePath}::${region.x},${region.y},${region.width},${region.height},${region.rotate ? 1 : 0}`;
	const cached = subTextureCache.get(cacheKey);
	if (cached) return cached;

	const baseTexture = textureCache.get(texturePath);
	if (!baseTexture) return null;

	const texHeight = baseTexture.height;

	const isRotated = region.rotate === true;
	const frameW = isRotated ? region.height : region.width;
	const frameH = isRotated ? region.width : region.height;
	const flippedY = texHeight - region.y - frameH;

	const subTex = new Texture({
		source: baseTexture.source,
		frame: new Rectangle(region.x, flippedY, frameW, frameH),
		rotate: isRotated ? 2 : 0,
	});

	subTextureCache.set(cacheKey, subTex);
	return subTex;
}

export function clearSubTextureCache(): void {
	subTextureCache.clear();
}

// ============================================================
// Scene render
// ============================================================

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

// ============================================================
// Object render
// ============================================================

export function renderObject(obj: GameObject, layerLocked = false): void {
	const container = new Container();
	const t = obj.transform;

	const isWireframe = getConfig()?.view.renderMode === "wireframe";
	const broken = getBrokenAssets();

	// 🆕 اول atlas رو چک کن
	const atlasProps = getAtlasProperties(obj);

	if (atlasProps && atlasProps.texture) {
		renderAtlasObject(obj, atlasProps, container, isWireframe);
	} else {
		// مسیر قدیمی components
		const components = obj.components ?? [];
		if (components.length === 0) {
			renderLegacy(obj, container, isWireframe);
		} else {
			for (const comp of components) {
				renderComponent(comp, obj, container, isWireframe);
			}
		}
	}

	if (container.children.length === 0) {
		renderEmptyFallback(obj, container);
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

	container.pivot.set(t.width * t.originX, t.height * t.originY);
	container.x = t.x;
	container.y = t.y;
	container.rotation = (t.rotation * Math.PI) / 180;
	container.scale.set(t.scaleX, t.scaleY);

	container.hitArea = new Rectangle(0, 0, t.width, t.height);

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

// ============================================================
// Atlas renderer
// ============================================================

function renderAtlasObject(obj: GameObject, atlasProps: NonNullable<ReturnType<typeof getAtlasProperties>>, container: Container, _isWireframe: boolean): void {
	const t = obj.transform;
	const cached = textureCache.get(atlasProps.texture);
	if (!cached) {
		// texture هنوز لود نشده — fallback خالی
		return;
	}

	// 🆕 اول از atlas cache گرفته شده از extension استفاده کن
	const atlasData = getAtlasFromCache(atlasProps.texture);
	const rects = resolveFrameRects(atlasProps, atlasData ? ({ texturePath: atlasData.texturePath, atlasPath: atlasData.atlasPath, regions: atlasData.regions } as never) : null, cached.width, cached.height);

	if (rects.length === 0) {
		// هیچ frame ای نیست — فقط texture کامل نشون بده
		const sprite = new Sprite(cached);
		sprite.width = t.width;
		sprite.height = t.height;
		sprite.eventMode = "none";
		applyTint(sprite, atlasProps.tint);
		container.addChild(sprite);
		return;
	}

	// اولین frame رو رندر کن (بقیه برای preview در inspector)
	const first = rects[0];
	const subTex = getSubTexture(atlasProps.texture, first);
	if (!subTex) return;

	const sprite = new Sprite(subTex);
	sprite.width = t.width;
	sprite.height = t.height;
	sprite.eventMode = "none";
	applyTint(sprite, atlasProps.tint);
	container.addChild(sprite);

	// badge برای sequence/grid
	if (atlasProps.mode !== "single" && rects.length > 1) {
		const badge = new Text({
			text: atlasProps.mode === "grid" ? `⊞ ${rects.length}` : `🎬 ${rects.length}`,
			style: new TextStyle({ fontSize: 11, fill: "#ffffff", stroke: { color: 0x000000, width: 3 } }),
		});
		badge.x = t.width - 40;
		badge.y = 2;
		badge.eventMode = "none";
		container.addChild(badge);
	}
}

function applyTint(sprite: Sprite, tint: string | undefined): void {
	if (!tint || tint === "#ffffff") return;
	const color = parseInt(tint.replace("#", ""), 16);
	if (!Number.isNaN(color)) sprite.tint = color;
}

// ============================================================
// Component renderers
// ============================================================

function renderComponent(comp: Component, obj: GameObject, container: Container, isWireframe: boolean): void {
	const t = obj.transform;

	switch (comp.type) {
		case "sprite": {
			if (!comp.texture) break;
			const cached = textureCache.get(comp.texture);
			if (!cached) break;

			const sprite = new Sprite(cached);
			sprite.width = t.width;
			sprite.height = t.height;
			sprite.eventMode = "none";

			if (comp.tint) {
				applyTint(sprite, comp.tint);
			}

			if (comp.flipX) sprite.scale.x *= -1;
			if (comp.flipY) sprite.scale.y *= -1;

			container.addChild(sprite);
			break;
		}

		case "animation": {
			if (!comp.texture || comp.frames.length === 0) break;
			const cached = textureCache.get(comp.texture);
			if (!cached) break;

			// 🆕 از atlas cache برای پیدا کردن sub-texture frame اول استفاده کن
			const atlasData = getAtlasFromCache(comp.texture);
			let subTex: Texture | null = null;

			if (atlasData && atlasData.regions.length > 0) {
				const firstFrameName = comp.frames[0];
				const region = atlasData.regions.find((r) => r.name === firstFrameName);
				if (region) {
					subTex = getSubTexture(comp.texture, {
						x: region.x,
						y: region.y,
						width: region.width,
						height: region.height,
						rotate: region.rotate,
					});
				}
			}

			// 🆕 اگه atlas نداشتیم، از کل texture استفاده کن
			if (!subTex) {
				subTex = getSubTexture(comp.texture, { x: 0, y: 0, width: cached.width, height: cached.height });
			}
			if (!subTex) break;

			const sprite = new Sprite(subTex);
			sprite.width = t.width;
			sprite.height = t.height;
			sprite.eventMode = "none";
			container.addChild(sprite);

			const badge = new Text({
				text: "🎬",
				style: new TextStyle({ fontSize: 12 }),
			});
			badge.x = t.width - 16;
			badge.y = 2;
			badge.eventMode = "none";
			container.addChild(badge);
			break;
		}

		case "shape": {
			const g = new Graphics();
			drawShape(g, comp.shape, t.width, t.height);

			const color = parseInt(comp.color.replace("#", ""), 16) || 0x4a9eff;

			if (isWireframe) {
				g.stroke({ width: 2, color, alpha: 1 });
			} else if (comp.filled) {
				g.fill({ color, alpha: 1 });
				if (comp.strokeWidth && comp.strokeWidth > 0) {
					const strokeColor = comp.strokeColor ? parseInt(comp.strokeColor.replace("#", ""), 16) : 0x000000;
					g.stroke({ width: comp.strokeWidth, color: strokeColor, alpha: 0.5 });
				}
			} else {
				g.stroke({ width: comp.strokeWidth ?? 2, color, alpha: 1 });
			}

			g.eventMode = "none";
			container.addChild(g);
			break;
		}

		case "text": {
			const txt = new Text({
				text: comp.text,
				style: new TextStyle({
					fill: comp.color || "#ffffff",
					fontSize: comp.fontSize || 16,
				}),
			});
			txt.eventMode = "none";
			container.addChild(txt);
			break;
		}
	}
}

// ============================================================
// Legacy rendering
// ============================================================

function renderLegacy(obj: GameObject, container: Container, isWireframe: boolean): void {
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
		const color = obj.color ? parseInt(obj.color.replace("#", ""), 16) : 0x4a9eff;
		const g = new Graphics();

		if (obj.type === "shape") {
			const shapeType = (obj.properties?.shapeType as ShapeType) ?? "rectangle";
			drawShape(g, shapeType, t.width, t.height);
			if (isWireframe) {
				g.stroke({ width: 2, color, alpha: 1 });
			} else {
				g.fill({ color, alpha: 1 });
				g.stroke({ width: 1, color: 0x000000, alpha: 0.4 });
			}
			g.eventMode = "none";
			container.addChild(g);
		} else if (obj.type === "text") {
			const txt = new Text({
				text: obj.name,
				style: new TextStyle({ fill: obj.color || "#ffffff", fontSize: 16 }),
			});
			txt.eventMode = "none";
			container.addChild(txt);
		} else if (obj.type === "sprite") {
			renderEmptyFallback(obj, container);
		} else {
			renderEmptyFallback(obj, container);
		}
	}
}

// ============================================================
// Empty fallback
// ============================================================

function renderEmptyFallback(obj: GameObject, container: Container): void {
	const t = obj.transform;
	const color = obj.color ? parseInt(obj.color.replace("#", ""), 16) : 0x9b59b6;

	const border = new Graphics();
	drawDashedRect(border, 0, 0, t.width, t.height, 6, 4);
	border.stroke({ width: 1.5, color, alpha: 0.55 });
	border.eventMode = "none";
	container.addChild(border);

	const iconSize = Math.min(t.width, t.height) * 0.35;
	const half = iconSize / 2;
	const cx = t.width / 2;
	const cy = t.height / 2;

	const icon = new Graphics();

	icon.rect(cx - half, cy - half, iconSize, iconSize);
	icon.fill({ color, alpha: 0.25 });
	icon.stroke({ width: 1.5, color, alpha: 0.9 });

	icon.circle(cx, cy, Math.max(1.5, iconSize * 0.08));
	icon.fill({ color, alpha: 1 });

	icon.eventMode = "none";
	container.addChild(icon);
}

function drawDashedRect(g: Graphics, x: number, y: number, w: number, h: number, dashLen: number, gapLen: number): void {
	const x2 = x + w;
	const y2 = y + h;

	dashLine(g, x, y, x2, y, dashLen, gapLen);
	dashLine(g, x2, y, x2, y2, dashLen, gapLen);
	dashLine(g, x2, y2, x, y2, dashLen, gapLen);
	dashLine(g, x, y2, x, y, dashLen, gapLen);
}

function dashLine(g: Graphics, x1: number, y1: number, x2: number, y2: number, dashLen: number, gapLen: number): void {
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

// ============================================================
// Shape drawing
// ============================================================

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

// ============================================================
// Re-render object
// ============================================================

export function rerenderObject(obj: GameObject): void {
	const old = objectSprites.get(obj.id);
	if (old) {
		contentLayer.removeChild(old);
		old.removeAllListeners();
		old.destroy({ children: true });
		objectSprites.delete(obj.id);
	}
	const layer = scene?.layers.find((l) => l.objects.some((o) => o.id === obj.id));
	renderObject(obj, layer?.locked ?? false);
}
