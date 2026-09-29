// src/webview/viewport/features/snapping/snap-engine.ts
import type { Scene } from "../../../../types/scene.js";
import { computeSnap as computeSnapCore } from "../../../../features/snapping/snap-engine.js";
import type { SnapConfig, SnapResult } from "../../../../features/snapping/snap-types.js";
import type { GameObject } from "../../../../types/scene.js";

/**
 * wrapper سمت webview برای computeSnap.
 * config رو از config-store می‌گیره و scale رو از viewport.
 */
export function computeSnapForObject(proposedX: number, proposedY: number, primaryObj: GameObject, excludeIds: Set<string>, scene: Scene, config: SnapConfig, viewportScale: number): SnapResult {
	return computeSnapCore(proposedX, proposedY, primaryObj.transform.width, primaryObj.transform.height, primaryObj.transform.originX, primaryObj.transform.originY, excludeIds, scene, config, viewportScale);
}
