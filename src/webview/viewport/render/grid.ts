// src/webview/viewport/render/grid.ts
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { gridLayer, scene } from "../state.js";
import { getConfig } from "../config-store.js";
import { getCurrentTheme } from "../theme/theme-manager.js";

// ============================================================
// Constants
// ============================================================

const DEFAULT_BORDER_COLOR = 0x4aa8ff;
const OVERFLOW_COLOR = 0xff5555;
const BORDER_WIDTH = 2;
const CORNER_LENGTH = 24;
const CORNER_WIDTH = 3;

// ============================================================
// Main
// ============================================================

export function redrawGrid(): void {
	if (!scene) return;
	gridLayer.removeChildren();

	const config = getConfig();
	const showGrid = config?.view.showGrid !== false;
	const showBorder = config?.view.showWorldBorder !== false;

	if (!showGrid && !showBorder) return;

	const gridSize = scene.gridSize || 32;
	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	// ---------- Grid ----------
	if (showGrid) {
		drawGrid(gridSize, worldW, worldH);
	}

	// ---------- World Border ----------
	if (showBorder) {
		drawWorldBorder(worldW, worldH);
	}
}

// ============================================================
// Grid
// ============================================================

function drawGrid(gridSize: number, worldW: number, worldH: number): void {
	const g = new Graphics();

	// خطوط اصلی
	for (let x = 0; x <= worldW; x += gridSize) {
		g.moveTo(x, 0);
		g.lineTo(x, worldH);
	}
	for (let y = 0; y <= worldH; y += gridSize) {
		g.moveTo(0, y);
		g.lineTo(worldW, y);
	}
	g.stroke({ width: 1, color: 0x808080, alpha: 0.35 });

	// 🆕 subdivision — نیم‌خط‌های کمرنگ‌تر
	// (اگه grid بزرگ باشه، subdivision برای دقت خوبه)
	if (gridSize >= 64) {
		const sub = new Graphics();
		const half = gridSize / 2;
		for (let x = half; x <= worldW; x += gridSize) {
			sub.moveTo(x, 0);
			sub.lineTo(x, worldH);
		}
		for (let y = half; y <= worldH; y += gridSize) {
			sub.moveTo(0, y);
			sub.lineTo(worldW, y);
		}
		sub.stroke({ width: 1, color: 0x808080, alpha: 0.15 });
		gridLayer.addChild(sub);
	}

	gridLayer.addChild(g);
}

// ============================================================
// World Border
// ============================================================

function drawWorldBorder(worldW: number, worldH: number): void {
	const theme = getCurrentTheme();
	const overflow = hasOverflow(worldW, worldH);
	const baseColor = overflow ? OVERFLOW_COLOR : DEFAULT_BORDER_COLOR;

	// ---------- 1. کادر اصلی ----------
	const border = new Graphics();
	border.rect(0, 0, worldW, worldH);
	border.stroke({ width: BORDER_WIDTH, color: baseColor, alpha: 1 });
	gridLayer.addChild(border);

	// ---------- 2. Glow بیرونی ----------
	const glow = new Graphics();
	glow.rect(-3, -3, worldW + 6, worldH + 6);
	glow.stroke({ width: 1, color: baseColor, alpha: 0.35 });
	gridLayer.addChild(glow);

	// ---------- 3. گوشه‌های برجسته ----------
	drawCornerMarks(worldW, worldH, baseColor);

	// ---------- 4. Label با ابعاد ----------
	drawDimensionLabel(worldW, worldH, baseColor, overflow);
}

function drawCornerMarks(worldW: number, worldH: number, color: number): void {
	const corners = new Graphics();
	const L = CORNER_LENGTH;

	// Top-left
	corners.moveTo(0, L);
	corners.lineTo(0, 0);
	corners.lineTo(L, 0);

	// Top-right
	corners.moveTo(worldW - L, 0);
	corners.lineTo(worldW, 0);
	corners.lineTo(worldW, L);

	// Bottom-right
	corners.moveTo(worldW, worldH - L);
	corners.lineTo(worldW, worldH);
	corners.lineTo(worldW - L, worldH);

	// Bottom-left
	corners.moveTo(L, worldH);
	corners.lineTo(0, worldH);
	corners.lineTo(0, worldH - L);

	corners.stroke({ width: CORNER_WIDTH, color, alpha: 1 });
	gridLayer.addChild(corners);
}

function drawDimensionLabel(worldW: number, worldH: number, color: number, overflow: boolean): void {
	const text = overflow ? `⚠ ${worldW} × ${worldH} (overflow)` : `${worldW} × ${worldH}`;

	const style = new TextStyle({
		fontFamily: "monospace",
		fontSize: 12,
		fill: color,
		fontWeight: "bold",
		stroke: { color: 0x000000, width: 3 },
	});

	const label = new Text({ text, style });

	// label رو وسط بالا بذار
	label.x = worldW / 2 - label.width / 2;
	label.y = -22;
	label.eventMode = "none";

	gridLayer.addChild(label);
}

// ============================================================
// Overflow Detection
// ============================================================

/**
 * چک می‌کنه آیا آبجکتی بیرون world bounds هست یا نه.
 * اگه بله، کادر قرمز می‌شه.
 */
function hasOverflow(worldW: number, worldH: number): boolean {
	if (!scene) return false;

	const MARGIN = 2;

	for (const layer of scene.layers) {
		if (!layer.visible) continue;
		for (const obj of layer.objects) {
			const t = obj.transform;
			const left = t.x - t.width * t.originX;
			const top = t.y - t.height * t.originY;
			const right = left + t.width;
			const bottom = top + t.height;

			if (left < -MARGIN || top < -MARGIN || right > worldW + MARGIN || bottom > worldH + MARGIN) {
				return true;
			}
		}
	}

	return false;
}
