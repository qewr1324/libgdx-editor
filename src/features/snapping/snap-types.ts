// src/features/snapping/snap-types.ts
/**
 * تایپ‌های مشترک بین extension و webview برای snap.
 */

export interface SnapConfig {
	enabled: boolean;
	threshold: number; // در screen pixels
	snapToObjects: boolean;
	snapToWorldEdges: boolean;
	snapToGrid: boolean;
	showGuides: boolean;
	guideColor: string;
}

export const DEFAULT_SNAP_CONFIG: SnapConfig = {
	enabled: true,
	threshold: 8,
	snapToObjects: true,
	snapToWorldEdges: true,
	snapToGrid: false,
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
	source: "object" | "world" | "grid";
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
