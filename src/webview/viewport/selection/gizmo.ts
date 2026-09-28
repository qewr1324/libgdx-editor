import { Graphics, Text, TextStyle } from "pixi.js";
import { gizmoLayer } from "../state.js";
import type { GameObject } from "../../../types/scene.js";
import { drawDashedLine } from "../utils/geometry.js";

export function clearGizmo(): void {
	gizmoLayer.removeChildren();
}

export function drawDragGuides(obj: GameObject): void {
	clearGizmo();
	const t = obj.transform;

	const guideColor = 0x00d4ff;
	const dashLen = 4;
	const gapLen = 4;
	const offset = 30;

	const hLine = new Graphics();
	drawDashedLine(hLine, t.x, t.y, t.x - offset, t.y, dashLen, gapLen);
	hLine.stroke({ width: 1, color: guideColor, alpha: 0.7 });
	gizmoLayer.addChild(hLine);

	const vLine = new Graphics();
	drawDashedLine(vLine, t.x, t.y, t.x, t.y - offset, dashLen, gapLen);
	vLine.stroke({ width: 1, color: guideColor, alpha: 0.7 });
	gizmoLayer.addChild(vLine);

	const label = new Text({
		text: `${Math.round(t.x)}, ${Math.round(t.y)}`,
		style: new TextStyle({
			fill: "#00d4ff",
			fontSize: 11,
			fontFamily: "monospace",
			stroke: { color: 0x000000, width: 3 },
		}),
	});
	label.x = t.x + 8;
	label.y = t.y - offset - 16;
	gizmoLayer.addChild(label);
}

export function drawResizeLabel(obj: GameObject): void {
	clearGizmo();
	const t = obj.transform;
	const label = new Text({
		text: `${Math.round(t.width)} × ${Math.round(t.height)}`,
		style: new TextStyle({
			fill: "#ffaa00",
			fontSize: 11,
			fontFamily: "monospace",
			stroke: { color: 0x000000, width: 3 },
		}),
	});
	label.x = t.x + t.width / 2 + 8;
	label.y = t.y + t.height / 2 + 8;
	gizmoLayer.addChild(label);
}

export function drawRotateGizmo(obj: GameObject, center: { x: number; y: number }, radius: number, mouseWorld: { x: number; y: number }, shift: boolean, alt: boolean): void {
	clearGizmo();

	const circle = new Graphics();
	circle.circle(center.x, center.y, radius);
	circle.stroke({ width: 1, color: 0x4aff9b, alpha: 0.4 });
	gizmoLayer.addChild(circle);

	const line = new Graphics();
	line.moveTo(center.x, center.y);
	line.lineTo(mouseWorld.x, mouseWorld.y);
	line.stroke({ width: 1, color: 0x4aff9b, alpha: 0.6 });
	gizmoLayer.addChild(line);

	const angleRad = (obj.transform.rotation * Math.PI) / 180;
	const visualAngle = angleRad - Math.PI / 2;
	const endX = center.x + Math.cos(visualAngle) * radius;
	const endY = center.y + Math.sin(visualAngle) * radius;

	const snapLine = new Graphics();
	snapLine.moveTo(center.x, center.y);
	snapLine.lineTo(endX, endY);
	snapLine.stroke({ width: 2, color: 0xffaa00, alpha: 0.8 });
	gizmoLayer.addChild(snapLine);

	let labelText = `${Math.round(obj.transform.rotation)}°`;
	if (alt) labelText += " [90°]";
	else if (shift) labelText += " [15°]";

	const label = new Text({
		text: labelText,
		style: new TextStyle({
			fill: "#ffaa00",
			fontSize: 12,
			fontFamily: "monospace",
			fontWeight: "bold",
			stroke: { color: 0x000000, width: 3 },
		}),
	});
	label.x = mouseWorld.x + 12;
	label.y = mouseWorld.y - 18;
	gizmoLayer.addChild(label);

	const baseLine = new Graphics();
	baseLine.moveTo(center.x, center.y);
	baseLine.lineTo(center.x, center.y - radius);
	baseLine.stroke({ width: 1, color: 0xffffff, alpha: 0.2 });
	gizmoLayer.addChild(baseLine);
}
