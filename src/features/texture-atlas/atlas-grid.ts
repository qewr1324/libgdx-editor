// src/features/texture-atlas/atlas-grid.ts
import type { AtlasData, AtlasRegion } from "./atlas-types.js";
import type { AtlasProperties } from "./atlas-properties.js";

// ============================================================
// Grid Cell (pixel-based, بدون atlas)
// ============================================================

export interface GridCell {
	/** ایندکس سلول (0-based) */
	index: number;
	/** موقعیت x در تصویر (پیکسل) */
	x: number;
	/** موقعیت y در تصویر (پیکسل) */
	y: number;
	/** عرض سلول */
	width: number;
	/** ارتفاع سلول */
	height: number;
}

export interface GridLayout {
	cols: number;
	rows: number;
	cellWidth: number;
	cellHeight: number;
	totalCells: number;
}

/**
 * ابعاد هر cell رو حساب می‌کنه.
 *
 * @param imageWidth  عرض تصویر مبدأ
 * @param imageHeight ارتفاع تصویر مبدأ
 * @param cols        تعداد ستون‌ها
 * @param rows        تعداد ردیف‌ها
 * @param offsetX     فاصله افقی بین cell ها (پیکسل)
 * @param offsetY     فاصله عمودی بین cell ها (پیکسل)
 * @param paddingX    حاشیه داخلی هر cell (اختیاری)
 * @param paddingY    حاشیه داخلی هر cell (اختیاری)
 */
export function computeGridLayout(imageWidth: number, imageHeight: number, cols: number, rows: number, offsetX = 0, offsetY = 0, paddingX = 0, paddingY = 0): GridLayout {
	const safeCols = Math.max(1, Math.floor(cols));
	const safeRows = Math.max(1, Math.floor(rows));

	// فضای افقی مصرفی از offset ها
	const totalOffsetX = Math.max(0, safeCols - 1) * offsetX;
	const totalOffsetY = Math.max(0, safeRows - 1) * offsetY;

	const usableW = Math.max(0, imageWidth - totalOffsetX - 2 * paddingX * safeCols);
	const usableH = Math.max(0, imageHeight - totalOffsetY - 2 * paddingY * safeRows);

	const cellWidth = Math.floor(usableW / safeCols);
	const cellHeight = Math.floor(usableH / safeRows);

	return {
		cols: safeCols,
		rows: safeRows,
		cellWidth: Math.max(1, cellWidth),
		cellHeight: Math.max(1, cellHeight),
		totalCells: safeCols * safeRows,
	};
}

/**
 * تمام cell های grid رو تولید می‌کنه.
 */
export function computeGridCells(imageWidth: number, imageHeight: number, cols: number, rows: number, offsetX = 0, offsetY = 0, paddingX = 0, paddingY = 0): GridCell[] {
	const layout = computeGridLayout(imageWidth, imageHeight, cols, rows, offsetX, offsetY, paddingX, paddingY);
	const cells: GridCell[] = [];

	for (let r = 0; r < layout.rows; r++) {
		for (let c = 0; c < layout.cols; c++) {
			const index = r * layout.cols + c;
			const x = paddingX + c * (layout.cellWidth + offsetX);
			const y = paddingY + r * (layout.cellHeight + offsetY);
			cells.push({
				index,
				x,
				y,
				width: layout.cellWidth,
				height: layout.cellHeight,
			});
		}
	}

	return cells;
}

/**
 * یه cell خاص رو برمی‌گردونه.
 */
export function getGridCell(cells: GridCell[], index: number): GridCell | null {
	return cells.find((c) => c.index === index) ?? null;
}

// ============================================================
// Frame resolution (کلی، هم برای grid هم atlas)
// ============================================================

export interface FrameRect {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: boolean;
	/** برای debug */
	source: "atlas" | "grid";
}

/**
 * لیست frame rect ها رو بر اساس props برمی‌گردونه.
 * - اگه atlas موجود باشه → از region ها استفاده می‌کنه
 * - اگه atlas نباشه ولی mode=grid → از pixel grid استفاده می‌کنه
 * - اگه atlas نباشه و mode=single/sequence → لیست خالی
 */
export function resolveFrameRects(props: AtlasProperties, atlas: AtlasData | null, imageWidth: number, imageHeight: number): FrameRect[] {
	if (atlas) {
		return resolveFromAtlas(props, atlas);
	}
	if (props.mode === "grid") {
		return resolveFromGrid(props, imageWidth, imageHeight);
	}
	return [];
}

function resolveFromAtlas(props: AtlasProperties, atlas: AtlasData): FrameRect[] {
	switch (props.mode) {
		case "single": {
			if (!props.region) return [];
			const r = atlas.regions.find((x) => x.name === props.region);
			return r ? [regionToRect(r)] : [];
		}
		case "sequence": {
			if (!props.frames || props.frames.length === 0) return [];
			return props.frames
				.map((name) => atlas.regions.find((r) => r.name === name))
				.filter((r): r is AtlasRegion => !!r)
				.map(regionToRect);
		}
		case "grid": {
			const cols = props.gridCols ?? 1;
			const rows = props.gridRows ?? 1;
			const start = props.startIndex ?? 0;
			return atlas.regions.slice(start, start + cols * rows).map(regionToRect);
		}
	}
}

function resolveFromGrid(props: AtlasProperties, imageWidth: number, imageHeight: number): FrameRect[] {
	const cols = props.gridCols ?? 1;
	const rows = props.gridRows ?? 1;
	const ox = props.cellOffsetX ?? 0;
	const oy = props.cellOffsetY ?? 0;
	const start = props.startIndex ?? 0;

	const cells = computeGridCells(imageWidth, imageHeight, cols, rows, ox, oy);
	const startIdx = Math.max(0, Math.min(start, cells.length));

	return cells.slice(startIdx).map((cell, i) => ({
		name: `cell_${cell.index}`,
		x: cell.x,
		y: cell.y,
		width: cell.width,
		height: cell.height,
		rotate: false,
		source: "grid",
	}));
}

function regionToRect(r: AtlasRegion): FrameRect {
	return {
		name: r.name,
		x: r.x,
		y: r.y,
		width: r.width,
		height: r.height,
		rotate: r.rotate,
		source: "atlas",
	};
}

// ============================================================
// Helpers
// ============================================================

/**
 * تعداد کل frame هایی که این props تولید می‌کنه.
 */
export function countFrames(props: AtlasProperties, atlas: AtlasData | null): number {
	if (atlas) {
		switch (props.mode) {
			case "single":
				return props.region ? 1 : 0;
			case "sequence":
				return props.frames?.length ?? 0;
			case "grid":
				return Math.min((props.gridCols ?? 1) * (props.gridRows ?? 1), Math.max(0, atlas.regions.length - (props.startIndex ?? 0)));
		}
	}
	if (props.mode === "grid") {
		return (props.gridCols ?? 1) * (props.gridRows ?? 1);
	}
	return 0;
}
