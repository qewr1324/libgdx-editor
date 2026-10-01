// src/editor/guide-mutations.ts
import type { Scene } from "../types/scene.js";
import type { Guide, GuideAxis } from "../types/guides.js";
import { createGuide, createGuideId } from "../types/guides.js";

// ============================================================
// Add
// ============================================================

/**
 * یه guide جدید به صحنه اضافه می‌کنه.
 */
export function addGuideToScene(scene: Scene, axis: GuideAxis, position: number, color?: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.guides) newScene.guides = [];

	const guide = createGuide(axis, position, color);
	newScene.guides.push(guide);
	return newScene;
}

/**
 * یه guide با id مشخص اضافه می‌کنه (برای paste/duplicate).
 */
export function addGuideObjectToScene(scene: Scene, guide: Guide): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.guides) newScene.guides = [];

	// id رو تازه کن
	const cloned: Guide = {
		...guide,
		id: createGuideId(),
	};
	newScene.guides.push(cloned);
	return newScene;
}

// ============================================================
// Move
// ============================================================

/**
 * موقعیت یه guide رو آپدیت می‌کنه.
 */
export function moveGuideInScene(scene: Scene, guideId: string, newPosition: number): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.guides) return newScene;

	const guide = newScene.guides.find((g) => g.id === guideId);
	if (guide) {
		guide.position = Math.round(newPosition);
	}
	return newScene;
}

// ============================================================
// Remove
// ============================================================

/**
 * یه guide رو حذف می‌کنه.
 */
export function removeGuideFromScene(scene: Scene, guideId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.guides) return newScene;

	newScene.guides = newScene.guides.filter((g) => g.id !== guideId);
	return newScene;
}

/**
 * همه guide ها رو پاک می‌کنه.
 */
export function clearGuidesInScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	newScene.guides = [];
	return newScene;
}

// ============================================================
// Lock / Unlock
// ============================================================

/**
 * toggle قفل بودن یه guide.
 */
export function toggleGuideLockInScene(scene: Scene, guideId: string): Scene {
	const newScene = structuredClone(scene) as Scene;
	if (!newScene.guides) return newScene;

	const guide = newScene.guides.find((g) => g.id === guideId);
	if (guide) {
		guide.locked = !guide.locked;
	}
	return newScene;
}

// ============================================================
// Visibility
// ============================================================

/**
 * نمایش/مخفی کردن همه guide ها.
 */
export function toggleGuidesVisibilityInScene(scene: Scene): Scene {
	const newScene = structuredClone(scene) as Scene;
	newScene.showGuides = !(newScene.showGuides ?? true);
	return newScene;
}

// ============================================================
// Query
// ============================================================

/**
 * همه guide های عمودی.
 */
export function getVerticalGuides(scene: Scene): Guide[] {
	return (scene.guides ?? []).filter((g) => g.axis === "vertical");
}

/**
 * همه guide های افقی.
 */
export function getHorizontalGuides(scene: Scene): Guide[] {
	return (scene.guides ?? []).filter((g) => g.axis === "horizontal");
}

/**
 * چک می‌کنه آیا guide ای با موقعیت داده شده هست (برای dedup).
 */
export function findGuideAtPosition(scene: Scene, axis: GuideAxis, position: number, tolerance = 2): Guide | null {
	const guides = scene.guides ?? [];
	for (const g of guides) {
		if (g.axis !== axis) continue;
		if (Math.abs(g.position - position) <= tolerance) return g;
	}
	return null;
}
