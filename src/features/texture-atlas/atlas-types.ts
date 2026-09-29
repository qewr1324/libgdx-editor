// src/features/texture-atlas/atlas-types.ts
/**
 * تایپ‌های atlas برای LibGDX.
 * فرمت رسمی: https://github.com/libgdx/libgdx/wiki/Texture-packer
 */

export interface AtlasRegion {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	origWidth: number;
	origHeight: number;
	offsetX: number;
	offsetY: number;
	rotate: boolean;
	index: number;
}

export interface AtlasData {
	texturePath: string; // مسیر atlas.png (نسبی به صحنه)
	atlasPath: string; // مسیر atlas.atlas
	regions: AtlasRegion[];
}

export type AtlasSpriteMode = "single" | "sequence" | "grid";

export interface AtlasSpriteProperties {
	atlasPath: string;
	texturePath: string;
	mode: AtlasSpriteMode;
	regionName?: string;
	regionNames?: string[];
	gridCols?: number;
	gridRows?: number;
	frameIndex?: number;
	selectedRegion?: string;
}

export interface AtlasImportResult {
	texturePath: string;
	atlas: AtlasData | null;
}

export interface AtlasRegionSummary {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: boolean;
	index: number;
}
