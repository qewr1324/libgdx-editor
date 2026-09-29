// src/features/snapping/snap-engine.ts
import type { Scene } from "../../types/scene.js";
import type { GuideLine, SnapCandidate, SnapConfig, SnapResult } from "./snap-types.js";

const EPSILON = 0.001;

/**
 * موتور snap برای snap-to-objects و snap-to-world-edges.
 * snap-to-grid جداگانه توسط scene.snapToGrid کنترل میشه.
 */
export function computeSnap(proposedX: number, proposedY: number, width: number, height: number, originX: number, originY: number, excludeIds: Set<string>, scene: Scene, config: SnapConfig, worldToScreenScale: number): SnapResult {
	if (!config.enabled) {
		return { snappedX: proposedX, snappedY: proposedY, guides: [], didSnapX: false, didSnapY: false };
	}

	const screenThreshold = config.threshold;
	const worldThresholdX = screenThreshold / Math.max(worldToScreenScale, EPSILON);
	const worldThresholdY = worldThresholdX;

	const movingLeft = proposedX - width * originX;
	const movingRight = movingLeft + width;
	const movingCenterX = movingLeft + width / 2;

	const movingTop = proposedY - height * originY;
	const movingBottom = movingTop + height;
	const movingCenterY = movingTop + height / 2;

	let bestSnapX: { delta: number; candidate: SnapCandidate } | null = null;
	let bestSnapY: { delta: number; candidate: SnapCandidate } | null = null;

	// 1. snap به آبجکت‌های دیگه
	if (config.snapToObjects) {
		for (const layer of scene.layers) {
			if (!layer.visible || layer.locked) continue;
			for (const obj of layer.objects) {
				if (excludeIds.has(obj.id)) continue;
				const t = obj.transform;

				const oLeft = t.x - t.width * t.originX;
				const oRight = oLeft + t.width;
				const oCenterX = oLeft + t.width / 2;
				const oTop = t.y - t.height * t.originY;
				const oBottom = oTop + t.height;
				const oCenterY = oTop + t.height / 2;

				const xCandidates: Array<{ m: number; o: number }> = [
					{ m: movingLeft, o: oLeft },
					{ m: movingLeft, o: oRight },
					{ m: movingLeft, o: oCenterX },
					{ m: movingRight, o: oLeft },
					{ m: movingRight, o: oRight },
					{ m: movingRight, o: oCenterX },
					{ m: movingCenterX, o: oLeft },
					{ m: movingCenterX, o: oRight },
					{ m: movingCenterX, o: oCenterX },
				];
				for (const { m, o } of xCandidates) {
					const delta = o - m;
					if (Math.abs(delta) <= worldThresholdX) {
						if (!bestSnapX || Math.abs(delta) < Math.abs(bestSnapX.delta)) {
							bestSnapX = {
								delta,
								candidate: {
									axis: "x",
									position: o,
									source: "object",
									refMin: Math.min(oTop, movingTop),
									refMax: Math.max(oBottom, movingBottom),
								},
							};
						}
					}
				}

				const yCandidates: Array<{ m: number; o: number }> = [
					{ m: movingTop, o: oTop },
					{ m: movingTop, o: oBottom },
					{ m: movingTop, o: oCenterY },
					{ m: movingBottom, o: oTop },
					{ m: movingBottom, o: oBottom },
					{ m: movingBottom, o: oCenterY },
					{ m: movingCenterY, o: oTop },
					{ m: movingCenterY, o: oBottom },
					{ m: movingCenterY, o: oCenterY },
				];
				for (const { m, o } of yCandidates) {
					const delta = o - m;
					if (Math.abs(delta) <= worldThresholdY) {
						if (!bestSnapY || Math.abs(delta) < Math.abs(bestSnapY.delta)) {
							bestSnapY = {
								delta,
								candidate: {
									axis: "y",
									position: o,
									source: "object",
									refMin: Math.min(oLeft, movingLeft),
									refMax: Math.max(oRight, movingRight),
								},
							};
						}
					}
				}
			}
		}
	}

	// 2. snap به لبه‌های world
	if (config.snapToWorldEdges) {
		const worldLeft = 0;
		const worldRight = scene.worldSize.width;
		const worldCenterX = scene.worldSize.width / 2;
		const worldTop = 0;
		const worldBottom = scene.worldSize.height;
		const worldCenterY = scene.worldSize.height / 2;

		const xCandidates: Array<{ m: number; o: number }> = [
			{ m: movingLeft, o: worldLeft },
			{ m: movingLeft, o: worldRight },
			{ m: movingLeft, o: worldCenterX },
			{ m: movingRight, o: worldLeft },
			{ m: movingRight, o: worldRight },
			{ m: movingRight, o: worldCenterX },
			{ m: movingCenterX, o: worldCenterX },
			{ m: movingCenterX, o: worldLeft },
			{ m: movingCenterX, o: worldRight },
		];
		for (const { m, o } of xCandidates) {
			const delta = o - m;
			if (Math.abs(delta) <= worldThresholdX) {
				if (!bestSnapX || Math.abs(delta) < Math.abs(bestSnapX.delta)) {
					bestSnapX = {
						delta,
						candidate: {
							axis: "x",
							position: o,
							source: "world",
							refMin: 0,
							refMax: scene.worldSize.height,
						},
					};
				}
			}
		}

		const yCandidates: Array<{ m: number; o: number }> = [
			{ m: movingTop, o: worldTop },
			{ m: movingTop, o: worldBottom },
			{ m: movingTop, o: worldCenterY },
			{ m: movingBottom, o: worldTop },
			{ m: movingBottom, o: worldBottom },
			{ m: movingBottom, o: worldCenterY },
			{ m: movingCenterY, o: worldCenterY },
			{ m: movingCenterY, o: worldTop },
			{ m: movingCenterY, o: worldBottom },
		];
		for (const { m, o } of yCandidates) {
			const delta = o - m;
			if (Math.abs(delta) <= worldThresholdY) {
				if (!bestSnapY || Math.abs(delta) < Math.abs(bestSnapY.delta)) {
					bestSnapY = {
						delta,
						candidate: {
							axis: "y",
							position: o,
							source: "world",
							refMin: 0,
							refMax: scene.worldSize.width,
						},
					};
				}
			}
		}
	}

	const snappedX = bestSnapX ? proposedX + bestSnapX.delta : proposedX;
	const snappedY = bestSnapY ? proposedY + bestSnapY.delta : proposedY;

	const guides: GuideLine[] = [];
	if (config.showGuides) {
		if (bestSnapX) {
			guides.push({
				axis: "x",
				position: bestSnapX.candidate.position,
				from: bestSnapX.candidate.refMin,
				to: bestSnapX.candidate.refMax,
				color: config.guideColor,
				alpha: 0.9,
			});
		}
		if (bestSnapY) {
			guides.push({
				axis: "y",
				position: bestSnapY.candidate.position,
				from: bestSnapY.candidate.refMin,
				to: bestSnapY.candidate.refMax,
				color: config.guideColor,
				alpha: 0.9,
			});
		}
	}

	return {
		snappedX,
		snappedY,
		guides,
		didSnapX: !!bestSnapX,
		didSnapY: !!bestSnapY,
	};
}
