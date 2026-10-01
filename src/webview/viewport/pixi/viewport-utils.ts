// src/webview/viewport/pixi/viewport-utils.ts
import { viewport, scene } from "../state.js";

/**
 * utilities برای کنترل zoom/pan روی viewport
 */

export interface Bounds {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
}

// ============================================================
// Zoom to Fit
// ============================================================

/**
 * zoom رو طوری تنظیم می‌کنه که کل صحنه توی دید باشه.
 * از worldSize صحنه استفاده می‌کنه، نه از آبجکت‌ها.
 */
export function zoomToFit(padding = 0.05): void {
	if (!viewport || !scene) return;

	const worldW = scene.worldSize.width;
	const worldH = scene.worldSize.height;

	// ابعاد viewport (قابل دید)
	const screenW = viewport.screenWidth;
	const screenH = viewport.screenHeight;

	if (screenW <= 0 || screenH <= 0 || worldW <= 0 || worldH <= 0) return;

	// padding رو حساب کن
	const padX = worldW * padding;
	const padY = worldH * padding;
	const fitW = worldW + padX * 2;
	const fitH = worldH + padY * 2;

	// zoom = نسبت ابعاد
	const scaleX = screenW / fitW;
	const scaleY = screenH / fitH;
	const newScale = Math.min(scaleX, scaleY);

	// clamp zoom به بازه‌ی منطقی
	const clampedScale = Math.max(0.05, Math.min(10, newScale));

	viewport.setZoom(clampedScale, false);

	// center روی وسط صحنه
	viewport.moveCenter(worldW / 2, worldH / 2);
}

// ============================================================
// Reset View
// ============================================================

/**
 * zoom رو به 1 و center رو به وسط صحنه برمی‌گردونه.
 */
export function resetView(): void {
	if (!viewport || !scene) return;

	viewport.setZoom(1, false);
	viewport.moveCenter(scene.worldSize.width / 2, scene.worldSize.height / 2);
}

// ============================================================
// Zoom helpers
// ============================================================

/**
 * zoom فعلی رو برمی‌گردونه.
 */
export function getCurrentZoom(): number {
	return viewport?.scale.x ?? 1;
}

/**
 * zoom رو به یه مقدار مشخص ست می‌کنه (center ثابت).
 */
export function setZoom(zoom: number): void {
	if (!viewport) return;
	const clamped = Math.max(0.05, Math.min(10, zoom));
	viewport.setZoom(clamped, true);
}

/**
 * zoom in یه مرحله.
 */
export function zoomIn(factor = 1.25): void {
	setZoom(getCurrentZoom() * factor);
}

/**
 * zoom out یه مرحله.
 */
export function zoomOut(factor = 1.25): void {
	setZoom(getCurrentZoom() / factor);
}

// ============================================================
// Focus Object
// ============================================================

/**
 * یه نقطه رو وسط viewport میاره (بدون تغییر zoom).
 */
export function focusPoint(worldX: number, worldY: number): void {
	if (!viewport) return;
	viewport.moveCenter(worldX, worldY);
}
