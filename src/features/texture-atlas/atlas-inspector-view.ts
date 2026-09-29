// src/features/texture-atlas/atlas-inspector-view.ts
import type { AtlasData, AtlasRegion, AtlasSpriteProperties, AtlasSpriteMode } from "./atlas-types.js";

/**
 * helpers برای ساخت UI توصیفی در سمت inspector.
 * این فایل داده‌ها رو آماده می‌کنه تا inspector/main.ts ازش استفاده کنه.
 */

export interface AtlasInspectorModel {
	hasAtlas: boolean;
	atlasPath: string | null;
	texturePath: string | null;
	regions: AtlasRegion[];
	mode: AtlasSpriteMode;
	selectedRegion: string | null;
	frameIndex: number;
	gridCols: number;
	gridRows: number;
}

export function buildAtlasInspectorModel(props: Partial<AtlasSpriteProperties> | undefined, atlas: AtlasData | null): AtlasInspectorModel {
	if (!atlas || !props) {
		return {
			hasAtlas: false,
			atlasPath: null,
			texturePath: null,
			regions: [],
			mode: "single",
			selectedRegion: null,
			frameIndex: 0,
			gridCols: 1,
			gridRows: 1,
		};
	}

	return {
		hasAtlas: true,
		atlasPath: atlas.atlasPath,
		texturePath: atlas.texturePath,
		regions: atlas.regions,
		mode: props.mode ?? "single",
		selectedRegion: props.selectedRegion ?? props.regionName ?? atlas.regions[0]?.name ?? null,
		frameIndex: props.frameIndex ?? 0,
		gridCols: props.gridCols ?? 1,
		gridRows: props.gridRows ?? 1,
	};
}

export function getRegionsForMode(model: AtlasInspectorModel): AtlasRegion[] {
	if (!model.hasAtlas) return [];

	if (model.mode === "single") {
		if (!model.selectedRegion) return [];
		const r = model.regions.find((x) => x.name === model.selectedRegion);
		return r ? [r] : [];
	}

	if (model.mode === "grid") {
		const total = model.gridCols * model.gridRows;
		return model.regions.slice(0, total);
	}

	// sequence
	return model.regions;
}

export function clampFrameIndex(index: number, totalFrames: number): number {
	if (totalFrames <= 0) return 0;
	return Math.max(0, Math.min(index, totalFrames - 1));
}

export function validateGridDimensions(cols: number, rows: number, regionCount: number): string | null {
	if (!Number.isInteger(cols) || cols < 1) return "cols must be >= 1";
	if (!Number.isInteger(rows) || rows < 1) return "rows must be >= 1";
	if (cols * rows > regionCount) {
		return `grid ${cols}x${rows} needs ${cols * rows} regions, but atlas has ${regionCount}`;
	}
	return null;
}
