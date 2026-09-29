// src/features/snapping/snap-types.ts
/**
 * تایپ‌های مشترک بین extension و webview برای snap.
 *
 * دو سیستم snap جدا:
 *   - snapToGrid:  فقط grid (کنترل از scene.snapToGrid)
 *   - snapToObjects: فقط object/world edges (کنترل از config.snapping.enabled)
 */

export interface SnapConfig {
	/** فقط snap به آبجکت‌ها و لبه‌های world رو کنترل می‌کنه */
	enabled: boolean;
	threshold: number;
	snapToObjects: boolean;
	snapToWorldEdges: boolean;
	showGuides: boolean;
	guideColor: string;
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
	enabled: true,
	threshold: 8,
	snapToObjects: true,
	snapToWorldEdges: true,
	showGuides: true,
	guideColor: "#00d4ff",
};

export type GuideAxis = "x" | "y";

export interface GuideLine {
	axis: GuideAxis;
	position: number;
	from: number;
	to: number;
	color: string;
	alpha: number;
}

export interface SnapCandidate {
	axis: GuideAxis;
	position: number;
	source: "object" | "world";
	refMin: number;
	refMax: number;
}

export interface SnapResult {
	snappedX: number;
	snappedY: number;
	guides: GuideLine[];
	didSnapX: boolean;
	didSnapY: boolean;
}
