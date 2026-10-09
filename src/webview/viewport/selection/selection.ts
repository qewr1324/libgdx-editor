import { Container, Graphics, Rectangle } from "pixi.js";
import { app, interactionMode, scene, selectionLayer, selectedIds, setSelectedIds, setPrimarySelectedId } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { findObject } from "../utils/geometry.js";
import { vscode } from "../types.js";
import { beginResize } from "../interaction/resize.js";
import { beginRotate } from "../interaction/rotate.js";
import { beginMultiResize } from "../interaction/multi-resize.js";
import { beginMultiRotate } from "../interaction/multi-rotate.js";
import { beginMarquee, cancelMarquee, finishMarquee, updateMarquee } from "../interaction/marquee.js";
import { getConfig } from "../config-store.js";
import type { HandleType } from "../types.js";

// 🆕 مقایسه‌ی set-like برای جلوگیری از حلقه
function idsEqual(a: string[], b: string[]): boolean {
	if (a.length !== b.length) return false;
	const setB = new Set(b);
	for (const id of a) {
		if (!setB.has(id)) return false;
	}
	return true;
}

export function selectObjects(ids: string[], primaryId?: string | null): void {
	if (idsEqual(ids, selectedIds)) {
		setPrimarySelectedId(primaryId ?? (ids.length > 0 ? ids[ids.length - 1] : null));
		return;
	}

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

	const objects: GameObject[] = [];
	for (const id of selectedIds) {
		const obj = findObject(scene, id);
		if (obj) objects.push(obj);
	}
	if (objects.length === 0) return;

	for (const obj of objects) {
		const t = obj.transform;
		const outline = new Graphics();
		outline.rect(-t.width * t.originX - 3, -t.height * t.originY - 3, t.width + 6, t.height + 6);
		outline.stroke({ width: 2, color: 0xffaa00, alpha: 1 });
		outline.x = t.x;
		outline.y = t.y;
		outline.rotation = (t.rotation * Math.PI) / 180;
		outline.scale.set(t.scaleX, t.scaleY);
		selectionLayer.addChild(outline);
	}

	if (objects.length === 1) {
		drawSingleResizeHandles(objects[0], objects[0].transform);
		drawSingleRotateHandle(objects[0], objects[0].transform);
	} else {
		drawMultiBoundingBox(objects);
	}
}

function drawMultiBoundingBox(objects: GameObject[]): void {
	let minX = Infinity;
	let minY = Infinity;
	let maxX = -Infinity;
	let maxY = -Infinity;

	for (const obj of objects) {
		const t = obj.transform;
		const left = t.x - t.width * t.originX;
		const top = t.y - t.height * t.originY;
		const right = left + t.width;
		const bottom = top + t.height;
		if (left < minX) minX = left;
		if (top < minY) minY = top;
		if (right > maxX) maxX = right;
		if (bottom > maxY) maxY = bottom;
	}

	const w = maxX - minX;
	const h = maxY - minY;
	const cx = minX + w / 2;
	const cy = minY + h / 2;

	const box = new Graphics();
	box.rect(minX, minY, w, h);
	box.stroke({ width: 2, color: 0xaa88ff, alpha: 0.9 });
	selectionLayer.addChild(box);

	const positions: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
		{ type: "nw", x: minX, y: minY, cursor: "nwse-resize" },
		{ type: "n", x: cx, y: minY, cursor: "ns-resize" },
		{ type: "ne", x: maxX, y: minY, cursor: "nesw-resize" },
		{ type: "e", x: maxX, y: cy, cursor: "ew-resize" },
		{ type: "se", x: maxX, y: maxY, cursor: "nwse-resize" },
		{ type: "s", x: cx, y: maxY, cursor: "ns-resize" },
		{ type: "sw", x: minX, y: maxY, cursor: "nesw-resize" },
		{ type: "w", x: minX, y: cy, cursor: "ew-resize" },
	];

	for (const pos of positions) {
		const isCorner = pos.type === "nw" || pos.type === "ne" || pos.type === "se" || pos.type === "sw";
		const size = isCorner ? 10 : 8;

		const handle = new Graphics();
		if (isCorner) {
			handle.rect(-size / 2, -size / 2, size, size);
		} else {
			handle.circle(0, 0, size / 2);
		}
		handle.fill({ color: 0xaa88ff });
		handle.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });

		handle.x = pos.x;
		handle.y = pos.y;
		handle.eventMode = "static";
		handle.cursor = pos.cursor;

		handle.on("pointerdown", (e) => {
			e.stopPropagation();
			beginMultiResize(e, objects, pos.type, { minX, minY, maxX, maxY });
		});

		selectionLayer.addChild(handle);
	}

	const topY = minY - 25;
	const line = new Graphics();
	line.moveTo(cx, minY);
	line.lineTo(cx, topY);
	line.stroke({ width: 1, color: 0x4aff9b, alpha: 0.5 });
	selectionLayer.addChild(line);

	const rotateHandle = new Graphics();
	rotateHandle.circle(0, 0, 7);
	rotateHandle.fill({ color: 0x4aff9b });
	rotateHandle.stroke({ width: 2, color: 0x1a1a1a, alpha: 0.7 });

	const arrow = new Graphics();
	arrow.moveTo(-3, 0);
	arrow.lineTo(3, 0);
	arrow.lineTo(0, -3);
	arrow.closePath();
	arrow.fill({ color: 0x1a1a1a });
	rotateHandle.addChild(arrow);

	rotateHandle.x = cx;
	rotateHandle.y = topY;
	rotateHandle.eventMode = "static";
	rotateHandle.cursor = "grab";

	rotateHandle.on("pointerdown", (e) => {
		e.stopPropagation();
		beginMultiRotate(e, objects, { cx, cy });
	});

	selectionLayer.addChild(rotateHandle);
}

// ============================================================
// Single-object handles
// ============================================================

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
		const rad = (t.rotation * Math.PI) / 180;
		const cos = Math.cos(rad);
		const sin = Math.sin(rad);
		for (const h of locals) {
			const sx = h.lx * t.scaleX;
			const sy = h.ly * t.scaleY;
			const rx = sx * cos - sy * sin;
			const ry = sx * sin + sy * cos;
			result.push({ type: h.type, x: t.x + rx, y: t.y + ry, cursor: h.cursor });
		}
	} else {
		for (const h of locals) {
			result.push({ type: h.type, x: t.x + h.lx * t.scaleX, y: t.y + h.ly * t.scaleY, cursor: h.cursor });
		}
	}

	return result;
}

function drawSingleResizeHandles(obj: GameObject, t: GameObject["transform"]): void {
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

function drawSingleRotateHandle(obj: GameObject, t: GameObject["transform"]): void {
	const objectMode = isObjectMode();
	const topLocal = -t.height * t.originY;
	const centerYLocal = topLocal - 25;

	let handleWorldX: number;
	let handleWorldY: number;
	let rotationForLine: number;

	if (objectMode) {
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
		handleWorldX = t.x;
		handleWorldY = t.y + centerYLocal * t.scaleY;
		rotationForLine = 0;
	}

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
		topFinalX = t.x;
		topFinalY = t.y + topLocal * t.scaleY;
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
// 🆕 Marquee + Deselect — با canvas events (نه PixiJS stage)
// ============================================================

export function setupDeselect(): void {
	// 🆕 marquee رو روی canvas HTML گوش می‌دیم، نه روی app.stage
	// چون app.stage.hitArea کل صفحه رو پوشش می‌ده و event آبجکت‌ها رو بلاک می‌کنه.
	const canvas = app.canvas;

	let marqueeStarted = false;
	let pendingMarqueeTimeout: number | null = null;

	// 🆕 pointerdown → با تأخیر marquee رو شروع کن
	// اگه توی این فاصله container.on("pointerdown") صدا زده شد، interactionMode عوض می‌شه
	// و marquee بلاک می‌شه.
	canvas.addEventListener("pointerdown", (e) => {
		if (e.button !== 0) return;
		if (interactionMode !== "idle") return;

		// 🆕 بعد از یه tick چک کن که interactionMode هنوز idle هست
		pendingMarqueeTimeout = window.setTimeout(() => {
			pendingMarqueeTimeout = null;
			if (interactionMode !== "idle") return;

			const rect = canvas.getBoundingClientRect();
			const screenX = e.clientX - rect.left;
			const screenY = e.clientY - rect.top;
			beginMarquee(screenX, screenY);
			marqueeStarted = true;
		}, 0);
	});

	window.addEventListener("pointermove", (e) => {
		if (!marqueeStarted || interactionMode !== "marquee") return;
		const rect = canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		updateMarquee(screenX, screenY);
	});

	window.addEventListener("pointerup", (e) => {
		// 🆕 اگه marquee شروع نشده بود ولی timeout هست، کنسلش کن
		if (pendingMarqueeTimeout !== null) {
			clearTimeout(pendingMarqueeTimeout);
			pendingMarqueeTimeout = null;
			return;
		}
		if (!marqueeStarted) return;
		marqueeStarted = false;
		const rect = canvas.getBoundingClientRect();
		const screenX = e.clientX - rect.left;
		const screenY = e.clientY - rect.top;
		finishMarquee(screenX, screenY);
	});

	window.addEventListener("pointercancel", () => {
		if (pendingMarqueeTimeout !== null) {
			clearTimeout(pendingMarqueeTimeout);
			pendingMarqueeTimeout = null;
		}
		if (marqueeStarted) {
			marqueeStarted = false;
			cancelMarquee();
		}
	});
}
