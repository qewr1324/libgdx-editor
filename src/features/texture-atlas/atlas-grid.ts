// src/features/texture-atlas/atlas-grid.ts
import type { AtlasData, AtlasRegion } from "./atlas-types.js";
import type { AtlasProperties } from "./atlas-properties.js";

// ============================================================
// Grid Cell (pixel-based, بدون atlas)
// ============================================================

export interface GridCell {
	index: number;
	x: number;
	y: number;
	width: number;
	height: number;
}

export interface GridLayout {
	cols: number;
	rows: number;
	cellWidth: number;
	cellHeight: number;
	totalCells: number;
}

export function computeGridLayout(imageWidth: number, imageHeight: number, cols: number, rows: number, offsetX = 0, offsetY = 0, paddingX = 0, paddingY = 0): GridLayout {
	const safeCols = Math.max(1, Math.floor(cols));
	const safeRows = Math.max(1, Math.floor(rows));

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

export function getGridCell(cells: GridCell[], index: number): GridCell | null {
	return cells.find((c) => c.index === index) ?? null;
}

// ============================================================
// Frame resolution
// ============================================================

export interface FrameRect {
	name: string;
	x: number;
	y: number;
	width: number;
	height: number;
	rotate: boolean;
	source: "atlas" | "grid";
}

/**
 * لیست frame rect ها رو بر اساس props برمی‌گردونه.
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

	return cells.slice(startIdx).map((cell) => ({
		name: `cell_${cell.index}`,
		x: cell.x,
		y: cell.y,
		width: cell.width,
		height: cell.height,
		rotate: false,
		source: "grid" as const,
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

export function countFrames(props: AtlasProperties, atlas: AtlasData | null): number {
	if (atlas) {
		switch (props.mode) {
			case "single":
				return props.region ? 1 : 0;
			case "grid":
				return Math.min((props.gridCols ?? 1) * (props.gridRows ?? 1), Math.max(0, atlas.regions.length - (props.startIndex ?? 0)));
		}
	}
	if (props.mode === "grid") {
		return (props.gridCols ?? 1) * (props.gridRows ?? 1);
	}
	return 0;
}
