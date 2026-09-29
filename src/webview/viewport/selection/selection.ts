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

/**
 * ✅ آیا در حالت object هستیم؟
 */
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
 * ✅ در object mode، دسته‌ها حول مرکز آبجکت می‌چرخن.
 * در world mode، همیشه افقی/عمودی می‌مونن.
 */
function drawResizeHandles(obj: GameObject, t: GameObject["transform"]): void {
	const objectMode = isObjectMode();

	const left = -t.width * t.originX;
	const right = t.width * (1 - t.originX);
	const top = -t.height * t.originY;
	const bottom = t.height * (1 - t.originY);

	const positions: Array<{ type: HandleType; x: number; y: number; cursor: string }> = [
		{ type: "nw", x: left, y: top, cursor: "nwse-resize" },
		{ type: "n", x: (left + right) / 2, y: top, cursor: "ns-resize" },
		{ type: "ne", x: right, y: top, cursor: "nesw-resize" },
		{ type: "e", x: right, y: (top + bottom) / 2, cursor: "ew-resize" },
		{ type: "se", x: right, y: bottom, cursor: "nwse-resize" },
		{ type: "s", x: (left + right) / 2, y: bottom, cursor: "ns-resize" },
		{ type: "sw", x: left, y: bottom, cursor: "nesw-resize" },
		{ type: "w", x: left, y: (top + bottom) / 2, cursor: "ew-resize" },
	];

	// ✅ container برای گروه‌بندی دسته‌ها
	const group = new Container();
	group.x = t.x;
	group.y = t.y;
	group.scale.set(t.scaleX, t.scaleY);

	if (objectMode) {
		// ✅ در object mode، حول مرکز آبجکت می‌چرخیم
		group.rotation = (t.rotation * Math.PI) / 180;
	}
	// در world mode، rotation صفر می‌مونه

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

		if (objectMode) {
			// در object mode، موقعیت داخل group است (که چرخیده)
			handle.x = pos.x;
			handle.y = pos.y;
		} else {
			// در world mode، موقعیت رو باید دستی بچرخونیم تا دور آبجکت بچرخه
			// ولی خود آبجکت چرخیده و transform.x/y از مرکز آبجکت حساب می‌شن
			// پس در world mode، از rotate صفر استفاده می‌کنیم و موقعیت مطلق:
			const cos = Math.cos((t.rotation * Math.PI) / 180);
			const sin = Math.sin((t.rotation * Math.PI) / 180);
			// در world mode، ما نمی‌خوایم دسته‌ها بچرخن. یعنی مستقل از rotation آبجکت،
			// در جهت‌های جهانی قرار بگیرن. پس موقعیت رو با rotate صفر حساب می‌کنیم:
			handle.x = t.x + pos.x * t.scaleX;
			handle.y = t.y + pos.y * t.scaleY;
			// نکته: این کار باعث میشه دسته‌ها با آبجکت چرخیده هم‌راستا نباشن
		}

		handle.eventMode = "static";
		handle.cursor = pos.cursor;

		handle.on("pointerdown", (e) => {
			e.stopPropagation();
			beginResize(e, obj, pos.type);
		});

		if (objectMode) {
			group.addChild(handle);
		} else {
			// در world mode، مستقیم به selectionLayer اضافه می‌کنیم (بدون group)
			// ولی برای یکدستی، از یک container بدون rotation استفاده می‌کنیم
			group.addChild(handle);
		}
	}

	// در world mode، rotation صفر می‌مونه (که همین الان هست)
	if (!objectMode) {
		group.rotation = 0;
		// ولی موقعیت دسته‌ها رو باید مستقل حساب کنیم — که در حلقه بالا کردیم
		// ولی چون group.x = t.x و group.y = t.y هست، موقعیت handle.x = pos.x
		// در گروه بدون rotation، به t.x + pos.x * scaleX می‌رسه. پس OK است.
	}

	selectionLayer.addChild(group);
}

/**
 * ✅ rotate handle در object mode، حول مرکز آبجکت می‌چرخه.
 * در world mode، از بالای آبجکت (در جهت global) فاصله می‌گیره.
 */
function drawRotateHandle(obj: GameObject, t: GameObject["transform"]): void {
	const objectMode = isObjectMode();

	const top = -t.height * t.originY;
	const centerY = top - 25;

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

	const line = new Graphics();
	line.moveTo(0, top);
	line.lineTo(0, centerY);
	line.stroke({ width: 1, color: 0x4aff9b, alpha: 0.5 });

	const rotateContainer = new Container();
	rotateContainer.x = t.x;
	rotateContainer.y = t.y;
	rotateContainer.scale.set(t.scaleX, t.scaleY);

	if (objectMode) {
		// ✅ در object mode، همراستا با چرخش آبجکت
		rotateContainer.rotation = (t.rotation * Math.PI) / 180;
	} else {
		// در world mode، همیشه بالای آبجکت (نه در جهت چرخش)
		rotateContainer.rotation = 0;
	}

	const lineContainer = new Container();
	lineContainer.addChild(line);
	lineContainer.addChild(handle);
	lineContainer.addChild(arrow);

	if (objectMode) {
		lineContainer.y = centerY;
	} else {
		// در world mode، دسته‌ی rotate رو بالای آبجکت می‌ذاریم (نه در جهت چرخش)
		// یعنی حتی اگر آبجکت چرخیده باشه، دسته‌ی rotate بالای bounding box می‌مونه
		lineContainer.y = -t.height * t.originY - 25;
	}

	lineContainer.eventMode = "static";
	lineContainer.cursor = "grab";

	lineContainer.on("pointerdown", (e) => {
		e.stopPropagation();
		beginRotate(e, obj);
	});

	rotateContainer.addChild(lineContainer);
	selectionLayer.addChild(rotateContainer);
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
