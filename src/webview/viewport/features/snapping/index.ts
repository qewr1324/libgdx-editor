// src/webview/viewport/features/snapping/index.ts
export { computeSnapForObject } from "./snap-engine.js";
export { renderGuides, clearGuides, isGuidesVisible } from "./guides.js";

import { DEFAULT_SNAP_CONFIG, type SnapConfig } from "../../../../features/snapping/snap-types.js";
import { getConfig } from "../../config-store.js";
import { viewport } from "../../state.js";
import { computeSnapForObject } from "./snap-engine.js";
import { renderGuides, clearGuides } from "./guides.js";
import type { GameObject, Scene } from "../../../../types/scene.js";

let activeSnapConfig: SnapConfig = { ...DEFAULT_SNAP_CONFIG };

export function refreshSnapConfig(): void {
	const editorConfig = getConfig();
	if (!editorConfig) return;
	const sc = (editorConfig as unknown as { snapping?: Partial<SnapConfig> }).snapping;
	if (sc) {
		activeSnapConfig = { ...DEFAULT_SNAP_CONFIG, ...sc };
	}
}

export function getSnapConfig(): SnapConfig {
	return activeSnapConfig;
}

export function applySnapDuringDrag(proposedX: number, proposedY: number, primaryObj: GameObject, excludeIds: Set<string>, scene: Scene): { x: number; y: number } {
	const cfg = getSnapConfig();
	if (!cfg.enabled) {
		clearGuides();
		return { x: proposedX, y: proposedY };
	}

	const scale = viewport?.scale.x ?? 1;

	const result = computeSnapForObject(proposedX, proposedY, primaryObj, excludeIds, scene, cfg, scale);

	if (result.guides.length > 0) {
		renderGuides(result.guides, scene.worldSize.width, scene.worldSize.height);
	} else {
		clearGuides();
	}

	return { x: result.snappedX, y: result.snappedY };
}

export function clearSnapGuides(): void {
	clearGuides();
}

export function installSnapping(): void {
	refreshSnapConfig();
	window.addEventListener("config-changed", () => refreshSnapConfig());
}
