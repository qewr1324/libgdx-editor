import { Container, Graphics, Rectangle } from "pixi.js";
import { app, interactionMode, scene, selectionLayer, selectedIds, setSelectedIds, setPrimarySelectedId } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { findObject } from "../utils/geometry.js";
import { vscode } from "../types.js";
import { beginResize } from "../interaction/resize.js";
import { beginRotate } from "../interaction/rotate.js";
import { beginMarquee, cancelMarquee, finishMarquee, updateMarquee } from "../interaction/marquee.js";
import { getConfig } from "../config-store.js";
import type { HandleType } from "../types.js";

export function selectObjects(ids: string[], primaryId?: string | null): void {
	setSelectedIds(ids);
	setPrimarySelectedId(primaryId ?? (ids.length > 0 ? ids[ids.length - 1] : null));

	drawSelectionOutlines();

	if (ids.length === 0) {
		updateToolbarInfo("");
	} else if (ids.length === 1) {
		const obj = scene ? findObject(scene, ids[0]) : null;
		if (obj) updateToolbarInfo(`Selected: ${obj.name}`);
	} else {
		updateToolbarInfo(`${ids.length} objects selected`);
	}

	vscode.postMessage({ type: "selectObjects", objectIds: ids });
}

function updateToolbarInfo(text: string): void {
	const el = document.getElementById("toolbar-info");
	if (el) el.textContent = text;
}

function isObjectMode(): boolean {
	return getConfig()?.gizmo.mode === "object";
}

export function drawSelectionOutlines(): void {
	selectionLayer.removeChildren();
	if (selectedIds.length === 0 || !scene) return;

	for (const id of selectedIds) {
		const obj = findObject(scene, id);
		if (!obj) continue;
		const t = obj.transform;

		// ============================================================
		// کادر نارنجی دور آبجکت — همیشه همراستا با آبجکت
		// ============================================================
		const outline = new Graphics();
		outline.rect(-t.width * t.originX - 3, -t.height * t.originY - 3, t.width + 6, t.height + 6);
		outline.stroke({ width: 2, color: 0xffaa00, alpha: 1 });
		outline.x = t.x;
		outline.y = t.y;
		outline.rotation = (t.rotation * Math.PI) / 180;
		outline.scale.set(t.scaleX, t.scaleY);
		selectionLayer.addChild(outline);

		if (selectedIds.length === 1) {
			drawResizeHandles(obj, t);
			drawRotateHandle(obj, t);
		} else {
			const dot = new Graphics();
			dot.circle(0, 0, 4);
			dot.fill({ color: 0xffaa00 });
			dot.x = t.x;
			dot.y = t.y;
			selectionLayer.addChild(dot);
		}
	}
}

/**
 * ✅ محاسبه موقعیت ۸ گوشه/لبه در فضای جهانی.
 * rotation بر اساس mode اعمال می‌شه.
 */
function getHandlePositions(t: GameObject["transform"], objectMode: boolean): Array<{ type: HandleType; x: number; y: number; cursor: string }> {
	const left = -t.width * t.originX;
	const right = t.width * (1 - t.originX);
	const top = -t.height * t.originY;
	const bottom = t.height * (1 - t.originY);

	const locals: Array<{ type: HandleType; lx: number; ly: number; cursor: string }> = [
		{ type: "nw", lx: left, ly: top, cursor: "nwse-resize" },
		{ type: "n", lx: (left + right) / 2, ly: top, cursor: "ns-resize" },
		{ type: "ne", lx: right, ly: top, cursor: "nesw-resize" },
		{ type: "e", lx: right, ly: (top + bottom) / 2, cursor: "ew-resize" },
		{ type: "se", lx: right, ly: bottom, cursor: "nwse-resize" },
		{ type: "s", lx: (left + right) / 2, ly: bottom, cursor: "ns-resize" },
		{ type: "sw", lx: left, ly: bottom, cursor: "nesw-resize" },
		{ type: "w", lx: left, ly: (top + bottom) / 2, cursor: "ew-resize" },
	];

	const result: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [];

	if (objectMode) {
		// ✅ در object mode، مختصات محلی رو با rotation آبجکت می‌چرخونیم
		const rad = (t.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		for (const h of locals) {
			const sx = h.lx * t.scaleX;
			const sy = h.ly * t.scaleY;
			const rx = sx * cos - sy * sin;
			const ry = sx * sin + sy * cos;
			result.push({
				type: h.type,
				x: t.x + rx,
				y: t.y + ry,
				cursor: h.cursor,
			});
		}
	} else {
		// ✅ در world mode، فقط scale رو اعمال می‌کنیم (بدون rotation)
		for (const h of locals) {
			result.push({
				type: h.type,
				x: t.x + h.lx * t.scaleX,
				y: t.y + h.ly * t.scaleY,
				cursor: h.cursor,
			});
		}
	}

	return result;
}

function drawResizeHandles(obj: GameObject, t: GameObject["transform"]): void {
	const objectMode = isObjectMode();
	const positions = getHandlePositions(t, objectMode);

	for (const pos of positions) {
		const isCorner = pos.type === "nw" || pos.type === "ne" || pos.type === "se" || pos.type === "sw";
		const hw = 8;
		const size = isCorner ? hw + 2 : hw;

		const handle = new Graphics();
		if (isCorner) {
			handle.rect(-size / 2, -size / 2, size, size);
		} else {
			handle.circle(0, 0, size / 2);
		}
		handle.fill({ color: 0xffaa00 });
		handle.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });

		// ✅ در هر دو حالت، handle در موقعیت جهانی قرار می‌گیره
		handle.x = pos.x;
		handle.y = pos.y;

		handle.eventMode = "static";
		handle.cursor = pos.cursor;

		handle.on("pointerdown", (e) => {
			e.stopPropagation();
			beginResize(e, obj, pos.type);
		});

		selectionLayer.addChild(handle);
	}
}

/**
 * ✅ rotate handle در هر دو mode بالای bounding box قرار می‌گیره.
 * در object mode، همراستا با آبجکت می‌چرخه.
 * در world mode، همیشه بالای آبجکت (در جهت جهانی).
 */
function drawRotateHandle(obj: GameObject, t: GameObject["transform"]): void {
	const objectMode = isObjectMode();

	// موقعیت بالای bounding box در فضای محلی آبجکت
	const topLocal = -t.height * t.originY;
	const centerYLocal = topLocal - 25;

	// موقعیت جهانی rotate handle
	let handleWorldX: number;
	let handleWorldY: number;
	let rotationForLine: number;

	if (objectMode) {
		// در object mode، همراستا با rotation آبجکت
		const rad = (t.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const lx = 0;
		const ly = centerYLocal;
		const sx = lx * t.scaleX;
		const sy = ly * t.scaleY;
		const rx = sx * cos - sy * sin;
		const ry = sx * sin + sy * cos;
		handleWorldX = t.x + rx;
		handleWorldY = t.y + ry;
		rotationForLine = (t.rotation * Math.PI) / 180;
	} else {
		// در world mode، بالای آبجکت (بدون چرخش)
		handleWorldX = t.x;
		handleWorldY = t.y + centerYLocal * t.scaleY;
		rotationForLine = 0;
	}

	// خط اتصال از بالای آبجکت به handle
	const topWorldX = t.x;
	const topWorldY = t.y + topLocal * t.scaleY;

	// در object mode، بالای آبجکت هم باید بچرخه
	let topFinalX: number;
	let topFinalY: number;
	if (objectMode) {
		const rad = (t.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		const sx = 0;
		const sy = topLocal * t.scaleY;
		topFinalX = t.x + (sx * cos - sy * sin);
		topFinalY = t.y + (sx * sin + sy * cos);
	} else {
		topFinalX = topWorldX;
		topFinalY = topWorldY;
	}

	const line = new Graphics();
	line.moveTo(topFinalX, topFinalY);
	line.lineTo(handleWorldX, handleWorldY);
	line.stroke({ width: 1, color: 0x4aff9b, alpha: 0.5 });
	selectionLayer.addChild(line);

	const handle = new Graphics();
	handle.circle(0, 0, 7);
	handle.fill({ color: 0x4aff9b });
	handle.stroke({ width: 2, color: 0x1a1a1a, alpha: 0.7 });

	const arrow = new Graphics();
	arrow.moveTo(-3, 0);
	arrow.lineTo(3, 0);
	arrow.lineTo(0, -3);
	arrow.closePath();
	arrow.fill({ color: 0x1a1a1a });
	handle.addChild(arrow);

	handle.x = handleWorldX;
	handle.y = handleWorldY;
	handle.rotation = rotationForLine;
	handle.eventMode = "static";
	handle.cursor = "grab";

	handle.on("pointerdown", (e) => {
		e.stopPropagation();
		beginRotate(e, obj);
	});

	selectionLayer.addChild(handle);
}

// ============================================================
// Marquee + Deselect
// ============================================================

export function setupDeselect(): void {
	app.stage.eventMode = "static";
	app.stage.hitArea = new Rectangle(0, 0, window.innerWidth, window.innerHeight);

	let marqueeStarted = false;

	app.stage.on("pointerdown", (e) => {
		if (interactionMode !== "idle") return;
		if (e.button !== 0) return;
		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		beginMarquee(screenX, screenY);
		marqueeStarted = true;
	});

	window.addEventListener("pointermove", (e) => {
		if (!marqueeStarted || interactionMode !== "marquee") return;
		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		updateMarquee(screenX, screenY);
	});

	window.addEventListener("pointerup", (e) => {
		if (!marqueeStarted) return;
		marqueeStarted = false;
		const rect = app.canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		finishMarquee(screenX, screenY);
	});

	window.addEventListener("pointercancel", () => {
		if (marqueeStarted) {
			marqueeStarted = false;
			cancelMarquee();
		}
	});
}
