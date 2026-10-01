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

/** حالت انتخاب در AtlasComponent */
export type AtlasMode = "single" | "sequence" | "grid";

/** @deprecated استفاده از AtlasMode */
export type AtlasSpriteMode = AtlasMode;

export interface AtlasSpriteProperties {
	atlasPath: string;
	texturePath: string;
	mode: AtlasMode;
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

// ============================================================
// 🆕 Grid helpers
// ============================================================

/**
 * محاسبه‌ی sub-rect ها از حالت grid.
 * اگه atlas داشته باشیم → از regions[i]
 * اگه نه → از محاسبه‌ی pixel-based
 */
export interface GridCell {
	x: number;
	y: number;
	width: number;
	height: number;
	rotate?: boolean;
	regionName?: string;
}

/**
 * محاسبه‌ی grid pixel-based از یه texture با ابعاد مشخص.
 * گوشه‌ی بالا-چپ مبدأ است.
 */
export function computePixelGridCells(texWidth: number, texHeight: number, cols: number, rows: number, offsetX = 0, offsetY = 0): GridCell[] {
	const cells: GridCell[] = [];
	if (cols <= 0 || rows <= 0 || texWidth <= 0 || texHeight <= 0) return cells;

	// عرض هر cell: (کل - offset*2) / cols  — یا اگه offset بعد از هر cell باشه:
	// اینجا فرض می‌کنیم offset فاصله‌ی بین cell هاست
	const totalOffsetX = offsetX * (cols - 1);
	const totalOffsetY = offsetY * (rows - 1);
	const cellW = Math.floor((texWidth - totalOffsetX) / cols);
	const cellH = Math.floor((texHeight - totalOffsetY) / rows);

	if (cellW <= 0 || cellH <= 0) return cells;

	for (let r = 0; r < rows; r++) {
		for (let c = 0; c < cols; c++) {
			cells.push({
				x: c * (cellW + offsetX),
				y: r * (cellH + offsetY),
				width: cellW,
				height: cellH,
				rotate: false,
			});
		}
	}

	return cells;
}

/**
 * محاسبه‌ی grid region-based از یه لیست region.
 * از index شروع می‌کنه و cols×rows تا می‌گیره.
 */
export function computeRegionGridCells(regions: AtlasRegion[], cols: number, rows: number, startIndex = 0): GridCell[] {
	const cells: GridCell[] = [];
	if (cols <= 0 || rows <= 0) return cells;

	const total = cols * rows;
	for (let i = 0; i < total; i++) {
		const region = regions[startIndex + i];
		if (!region) break;
		cells.push({
			x: region.x,
			y: region.y,
			width: region.width,
			height: region.height,
			rotate: region.rotate,
			regionName: region.name,
		});
	}

	return cells;
}
