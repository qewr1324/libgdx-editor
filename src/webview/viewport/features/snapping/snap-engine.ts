// src/webview/viewport/features/snapping/snap-engine.ts
import type { Scene } from "../../../../types/scene.js";
import { computeSnap as computeSnapCore } from "../../../../features/snapping/snap-engine.js";
import type { SnapConfig, SnapResult, GuideLine } from "../../../../features/snapping/snap-types.js";
import type { GameObject } from "../../../../types/scene.js";

/**
 * wrapper سمت webview برای computeSnap.
 * config رو از config-store می‌گیره و scale رو از viewport.
 *
 * 🆕 حالا snap to guides هم پشتیبانی می‌شه.
 */
export function computeSnapForObject(proposedX: number, proposedY: number, primaryObj: GameObject, excludeIds: Set<string>, scene: Scene, config: SnapConfig, viewportScale: number): SnapResult {
	// ---------- snap اصلی (objects + world) ----------
	const coreResult = computeSnapCore(proposedX, proposedY, primaryObj.transform.width, primaryObj.transform.height, primaryObj.transform.originX, primaryObj.transform.originY, excludeIds, scene, config, viewportScale);

	// ---------- 🆕 snap به guide ها ----------
	if (!config.enabled) {
		return coreResult;
	}

	const guides = scene.guides ?? [];
	if (guides.length === 0 || scene.showGuides === false) {
		return coreResult;
	}

	const screenThreshold = config.threshold;
	const worldThreshold = screenThreshold / Math.max(viewportScale, 0.001);

	const width = primaryObj.transform.width;
	const height = primaryObj.transform.height;
	const originX = primaryObj.transform.originX;
	const originY = primaryObj.transform.originY;

	// موقعیت فعلی (بعد از snap اصلی)
	let snappedX = coreResult.snappedX;
	let snappedY = coreResult.snappedY;
	let didSnapX = coreResult.didSnapX;
	let didSnapY = coreResult.didSnapY;
	const extraGuides: GuideLine[] = [];

	// لبه‌های آبجکت
	const movingLeft = snappedX - width * originX;
	const movingRight = movingLeft + width;
	const movingCenterX = movingLeft + width / 2;

	const movingTop = snappedY - height * originY;
	const movingBottom = movingTop + height;
	const movingCenterY = movingTop + height / 2;

	// ---------- snap افقی به guide های vertical ----------
	if (!didSnapX) {
		let best: { delta: number; position: number } | null = null;

		for (const guide of guides) {
			if (guide.axis !== "vertical") continue;
			// 🆕 guide هایی که locked هستن رو رد کن
			if (guide.locked === true) continue;

			const candidates = [movingLeft, movingCenterX, movingRight];
			for (const m of candidates) {
				const delta = guide.position - m;
				if (Math.abs(delta) <= worldThreshold) {
					if (!best || Math.abs(delta) < Math.abs(best.delta)) {
						best = { delta, position: guide.position };
					}
				}
			}
		}

		if (best) {
			snappedX += best.delta;
			didSnapX = true;
			extraGuides.push({
				axis: "x",
				position: best.position,
				from: 0,
				to: scene.worldSize.height,
				color: "#00b8d4",
				alpha: 0.9,
			});
		}
	}

	// ---------- snap عمودی به guide های horizontal ----------
	if (!didSnapY) {
		let best: { delta: number; position: number } | null = null;

		for (const guide of guides) {
			if (guide.axis !== "horizontal") continue;
			// 🆕 guide هایی که locked هستن رو رد کن
			if (guide.locked === true) continue;

			const candidates = [movingTop, movingCenterY, movingBottom];
			for (const m of candidates) {
				const delta = guide.position - m;
				if (Math.abs(delta) <= worldThreshold) {
					if (!best || Math.abs(delta) < Math.abs(best.delta)) {
						best = { delta, position: guide.position };
					}
				}
			}
		}

		if (best) {
			snappedY += best.delta;
			didSnapY = true;
			extraGuides.push({
				axis: "y",
				position: best.position,
				from: 0,
				to: scene.worldSize.width,
				color: "#00b8d4",
				alpha: 0.9,
			});
		}
	}

	// ---------- نتیجه ----------
	return {
		snappedX,
		snappedY,
		guides: [...coreResult.guides, ...extraGuides],
		didSnapX,
		didSnapY,
	};
}
