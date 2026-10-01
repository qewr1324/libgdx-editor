// src/webview/viewport/selection/gizmo.ts
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { gizmoLayer } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { drawDashedLine } from "../utils/geometry.js";

// ============================================================
// Constants
// ============================================================

const GUIDE_COLOR = 0x00d4ff;
const RESIZE_COLOR = 0xffaa00;
const ROTATE_COLOR = 0x4aff9b;
const LABEL_BG_COLOR = 0x000000;
const LABEL_BG_ALPHA = 0.75;

// ============================================================
// Clear
// ============================================================

export function clearGizmo(): void {
	gizmoLayer.removeChildren();
}

// ============================================================
// Drag Guides (position label)
// ============================================================

export function drawDragGuides(obj: GameObject): void {
	clearGizmo();
	const t = obj.transform;

	// خطوط راهنما
	const dashLen = 4;
	const gapLen = 4;
	const offset = 40;

	const hLine = new Graphics();
	drawDashedLine(hLine, t.x, t.y, t.x - offset, t.y, dashLen, gapLen);
	hLine.stroke({ width: 1, color: GUIDE_COLOR, alpha: 0.7 });
	gizmoLayer.addChild(hLine);

	const vLine = new Graphics();
	drawDashedLine(vLine, t.x, t.y, t.x, t.y - offset, dashLen, gapLen);
	vLine.stroke({ width: 1, color: GUIDE_COLOR, alpha: 0.7 });
	gizmoLayer.addChild(vLine);

	// label با پس‌زمینه
	const labelText = `x: ${Math.round(t.x)}  y: ${Math.round(t.y)}`;
	const label = createLabel(labelText, GUIDE_COLOR);

	// موقعیت: بالای آبجکت
	label.x = t.x - label.width / 2;
	label.y = t.y - offset - label.height - 8;

	gizmoLayer.addChild(label);
}

// ============================================================
// Resize Label (size)
// ============================================================

export function drawResizeLabel(obj: GameObject): void {
	clearGizmo();
	const t = obj.transform;

	const labelText = `w: ${Math.round(t.width)}  h: ${Math.round(t.height)}`;
	const label = createLabel(labelText, RESIZE_COLOR);

	// موقعیت: زیر آبجکت
	label.x = t.x - label.width / 2;
	label.y = t.y + t.height * (1 - t.originY) + 8;

	gizmoLayer.addChild(label);
}

// ============================================================
// Rotate Gizmo + Label
// ============================================================

export function drawRotateGizmo(obj: GameObject, center: { x: number; y: number }, radius: number, mouseWorld: { x: number; y: number }, shift: boolean, alt: boolean): void {
	clearGizmo();

	// ---------- Circle ----------
	const circle = new Graphics();
	circle.circle(center.x, center.y, radius);
	circle.stroke({ width: 1, color: ROTATE_COLOR, alpha: 0.35 });
	gizmoLayer.addChild(circle);

	// ---------- Line to mouse ----------
	const line = new Graphics();
	line.moveTo(center.x, center.y);
	line.lineTo(mouseWorld.x, mouseWorld.y);
	line.stroke({ width: 1, color: ROTATE_COLOR, alpha: 0.5 });
	gizmoLayer.addChild(line);

	// ---------- Snap indicator ----------
	const angleRad = (obj.transform.rotation * Math.PI) / 180;
	const visualAngle = angleRad - Math.PI / 2;
	const endX = center.x + Math.cos(visualAngle) * radius;
	const endY = center.y + Math.sin(visualAngle) * radius;

	const snapLine = new Graphics();
	snapLine.moveTo(center.x, center.y);
	snapLine.lineTo(endX, endY);
	snapLine.stroke({ width: 2, color: ROTATE_COLOR, alpha: 0.9 });
	gizmoLayer.addChild(snapLine);

	// ---------- Base line ----------
	const baseLine = new Graphics();
	baseLine.moveTo(center.x, center.y);
	baseLine.lineTo(center.x, center.y - radius);
	baseLine.stroke({ width: 1, color: 0xffffff, alpha: 0.15 });
	gizmoLayer.addChild(baseLine);

	// ---------- Label ----------
	let labelText = `${Math.round(obj.transform.rotation)}°`;
	if (alt) labelText += " [90°]";
	else if (shift) labelText += " [15°]";

	const label = createLabel(labelText, ROTATE_COLOR);
	label.x = mouseWorld.x + 14;
	label.y = mouseWorld.y - 22;
	gizmoLayer.addChild(label);
}

// ============================================================
// Label Factory (با پس‌زمینه)
// ============================================================

function createLabel(text: string, color: number): Container {
	const container = new Container();
	container.eventMode = "none";

	const style = new TextStyle({
		fontFamily: "monospace",
		fontSize: 12,
		fill: color,
		fontWeight: "bold",
	});

	const textObj = new Text({ text, style });
	textObj.eventMode = "none";

	// پس‌زمینه
	const padding = 6;
	const bg = new Graphics();
	bg.roundRect(-padding, -padding, textObj.width + padding * 2, textObj.height + padding * 2, 3);
	bg.fill({ color: LABEL_BG_COLOR, alpha: LABEL_BG_ALPHA });
	bg.stroke({ width: 1, color, alpha: 0.4 });
	bg.eventMode = "none";

	container.addChild(bg);
	container.addChild(textObj);

	return container;
}
