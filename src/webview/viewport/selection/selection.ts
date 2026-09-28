import { Container, Graphics } from "pixi.js";
import { scene, selectionLayer, selectedIds, setSelectedIds, setPrimarySelectedId, primarySelectedId } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { findObject } from "../utils/geometry.js";
import { vscode } from "../types.js";
import { beginResize } from "../interaction/resize.js";
import { beginRotate } from "../interaction/rotate.js";
import type { HandleType } from "../types.js";
import { Rectangle } from "pixi.js";
import { app, interactionMode } from "../state.js";

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

function drawResizeHandles(obj: GameObject, t: GameObject["transform"]): void {
	const hw = 8;

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

	for (const pos of positions) {
		const isCorner = pos.type === "nw" || pos.type === "ne" || pos.type === "se" || pos.type === "sw";
		const size = isCorner ? hw + 2 : hw;

		const handle = new Graphics();
		if (isCorner) {
			handle.rect(-size / 2, -size / 2, size, size);
		} else {
			handle.circle(0, 0, size / 2);
		}
		handle.fill({ color: 0xffaa00 });
		handle.stroke({ width: 1, color: 0x1a1a1a, alpha: 0.5 });

		handle.x = t.x + pos.x * t.scaleX;
		handle.y = t.y + pos.y * t.scaleY;

		handle.eventMode = "static";
		handle.cursor = pos.cursor;

		handle.on("pointerdown", (e) => {
			e.stopPropagation();
			beginResize(e, obj, pos.type);
		});

		selectionLayer.addChild(handle);
	}
}

function drawRotateHandle(obj: GameObject, t: GameObject["transform"]): void {
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
	rotateContainer.rotation = (t.rotation * Math.PI) / 180;
	rotateContainer.scale.set(t.scaleX, t.scaleY);

	const lineContainer = new Container();
	lineContainer.addChild(line);
	lineContainer.addChild(handle);
	lineContainer.addChild(arrow);
	lineContainer.y = centerY;
	lineContainer.eventMode = "static";
	lineContainer.cursor = "grab";

	lineContainer.on("pointerdown", (e) => {
		e.stopPropagation();
		beginRotate(e, obj);
	});

	rotateContainer.addChild(lineContainer);
	selectionLayer.addChild(rotateContainer);
}

export function setupDeselect(): void {
	app.stage.eventMode = "static";
	app.stage.hitArea = new Rectangle(0, 0, window.innerWidth, window.innerHeight);
	app.stage.on("pointerdown", () => {
		if (interactionMode === "idle") {
			selectObjects([]);
		}
	});
}
