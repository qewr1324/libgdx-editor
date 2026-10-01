// src/webview/viewport/render/safe-area.ts
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { viewport, gizmoLayer } from "../state.js";
import type { Scene, SafeArea } from "../../../types/scene.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_COLOR = 0xff9500;
const BORDER_WIDTH = 2;
const DASH_LENGTH = 10;
const GAP_LENGTH = 6;
const CORNER_LENGTH = 20;
const CORNER_WIDTH = 3;

// ============================================================
// State
// ============================================================

let safeAreaLayer: Container | null = null;

// ============================================================
// Setup
// ============================================================

/**
 * setup layer مخصوص safe area.
 * این layer بالای همه چیز هست (روی gizmo).
 */
export function setupSafeAreaLayer(): void {
	if (!viewport) return;

	safeAreaLayer = new Container();
	safeAreaLayer.label = "safe-area";
	safeAreaLayer.eventMode = "none"; // غیرقابل کلیک

	// بالای همه چیز
	viewport.addChild(safeAreaLayer);
}

// ============================================================
// Render
// ============================================================

export function renderSafeArea(scene: Scene | null): void {
	if (!safeAreaLayer) return;

	safeAreaLayer.removeChildren();

	if (!scene || !scene.safeArea) return;
	if (!scene.safeArea.visible) return;

	drawSafeArea(scene.safeArea);
}

// ============================================================
// Draw
// ============================================================

function drawSafeArea(sa: SafeArea): void {
	if (!safeAreaLayer) return;

	const color = parseColor(sa.color);
	const x = sa.x;
	const y = sa.y;
	const w = sa.width;
	const h = sa.height;

	// ---------- 1. کادر اصلی ----------
	const border = new Graphics();

	if (sa.dashed) {
		drawDashedRect(border, x, y, w, h);
		border.stroke({ width: BORDER_WIDTH, color, alpha: 0.9 });
	} else {
		border.rect(x, y, w, h);
		border.stroke({ width: BORDER_WIDTH, color, alpha: 0.9 });
	}

	border.eventMode = "none";
	safeAreaLayer.addChild(border);

	// ---------- 2. Glow بیرونی ----------
	const glow = new Graphics();
	glow.rect(x - 2, y - 2, w + 4, h + 4);
	glow.stroke({ width: 1, color, alpha: 0.3 });
	glow.eventMode = "none";
	safeAreaLayer.addChild(glow);

	// ---------- 3. گوشه‌های برجسته ----------
	drawCornerMarks(x, y, w, h, color);

	// ---------- 4. Label ----------
	const labelText = sa.label ? `${sa.label} • ${Math.round(w)} × ${Math.round(h)}` : `${Math.round(w)} × ${Math.round(h)}`;

	const style = new TextStyle({
		fontFamily: "monospace",
		fontSize: 12,
		fill: color,
		fontWeight: "bold",
		stroke: { color: 0x000000, width: 3 },
	});

	const label = new Text({ text: labelText, style });
	label.x = x + w / 2 - label.width / 2;
	label.y = y - 22;
	label.eventMode = "none";
	safeAreaLayer.addChild(label);
}

function drawCornerMarks(x: number, y: number, w: number, h: number, color: number): void {
	if (!safeAreaLayer) return;

	const corners = new Graphics();
	const L = CORNER_LENGTH;

	// Top-left
	corners.moveTo(x, y + L);
	corners.lineTo(x, y);
	corners.lineTo(x + L, y);

	// Top-right
	corners.moveTo(x + w - L, y);
	corners.lineTo(x + w, y);
	corners.lineTo(x + w, y + L);

	// Bottom-right
	corners.moveTo(x + w, y + h - L);
	corners.lineTo(x + w, y + h);
	corners.lineTo(x + w - L, y + h);

	// Bottom-left
	corners.moveTo(x + L, y + h);
	corners.lineTo(x, y + h);
	corners.lineTo(x, y + h - L);

	corners.stroke({ width: CORNER_WIDTH, color, alpha: 1 });
	corners.eventMode = "none";
	safeAreaLayer.addChild(corners);
}

// ============================================================
// Dashed Rect Helper
// ============================================================

function drawDashedRect(g: Graphics, x: number, y: number, w: number, h: number): void {
	// top
	dashLine(g, x, y, x + w, y);
	// right
	dashLine(g, x + w, y, x + w, y + h);
	// bottom
	dashLine(g, x + w, y + h, x, y + h);
	// left
	dashLine(g, x, y + h, x, y);
}

function dashLine(g: Graphics, x1: number, y1: number, x2: number, y2: number): void {
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
		const endPos = Math.min(pos + DASH_LENGTH, len);
		const endX = x1 + ux * endPos;
		const endY = y1 + uy * endPos;
		g.moveTo(startX, startY);
		g.lineTo(endX, endY);
		pos += DASH_LENGTH + GAP_LENGTH;
	}
}

// ============================================================
// Helpers
// ============================================================

function parseColor(hex: string | undefined): number {
	if (!hex) return DEFAULT_COLOR;
	const clean = hex.replace("#", "");
	const num = Number.parseInt(clean, 16);
	return Number.isNaN(num) ? DEFAULT_COLOR : num;
}
