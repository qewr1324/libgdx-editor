// src/features/texture-atlas/atlas-parser.ts
import type { AtlasData, AtlasRegion, AtlasRegionSummary } from "./atlas-types.js";

/**
 * parser برای فایل .atlas استاندارد LibGDX.
 */
export function parseAtlasFile(atlasPath: string, content: string, texturePath: string): AtlasData {
	const lines = content
		.split(/\r?\n/)
		.map((l) => l.trim())
		.filter((l) => l.length > 0 && !l.startsWith("#"));

	const regions: AtlasRegion[] = [];
	let current: Partial<AtlasRegion> | null = null;

	const finalize = () => {
		if (current && current.name) {
			regions.push({
				name: current.name,
				x: current.x ?? 0,
				y: current.y ?? 0,
				width: current.width ?? 0,
				height: current.height ?? 0,
				origWidth: current.origWidth ?? current.width ?? 0,
				origHeight: current.origHeight ?? current.height ?? 0,
				offsetX: current.offsetX ?? 0,
				offsetY: current.offsetY ?? 0,
				rotate: current.rotate ?? false,
				index: current.index ?? -1,
			});
		}
		current = null;
	};

	let inHeader = true;
	let headerLineCount = 0;

	for (const line of lines) {
		if (inHeader) {
			if (line.startsWith("size:") || line.startsWith("format:") || line.startsWith("filter:") || line.startsWith("repeat:") || line.startsWith("pma:")) {
				headerLineCount++;
				continue;
			}
			if (headerLineCount === 0) {
				headerLineCount++;
				continue;
			}
			inHeader = false;
		}

		const colonIdx = line.indexOf(":");
		if (colonIdx > 0 && !line.startsWith(" ")) {
			const potentialKey = line.substring(0, colonIdx).trim();
			const knownKeys = ["rotate", "xy", "size", "orig", "offset", "index", "split", "pad", "bounds"];
			if (knownKeys.includes(potentialKey) && current) {
				const value = line.substring(colonIdx + 1).trim();
				applyProperty(current, potentialKey, value);
				continue;
			}

			finalize();
			current = { name: line.substring(0, colonIdx).trim() };
			continue;
		}

		if (colonIdx > 0 && current) {
			const key = line.substring(0, colonIdx).trim();
			const value = line.substring(colonIdx + 1).trim();
			applyProperty(current, key, value);
			continue;
		}

		finalize();
		current = { name: line };
	}

	finalize();

	return { texturePath, atlasPath, regions };
}

function applyProperty(region: Partial<AtlasRegion>, key: string, value: string): void {
	switch (key) {
		case "rotate":
			region.rotate = value === "true";
			break;
		case "xy": {
			const [x, y] = value.split(",").map((s) => Number.parseInt(s.trim(), 10));
			region.x = x;
			region.y = y;
			break;
		}
		case "size": {
			const [w, h] = value.split(",").map((s) => Number.parseInt(s.trim(), 10));
			region.width = w;
			region.height = h;
			break;
		}
		case "orig": {
			const [w, h] = value.split(",").map((s) => Number.parseInt(s.trim(), 10));
			region.origWidth = w;
			region.origHeight = h;
			break;
		}
		case "offset": {
			const [ox, oy] = value.split(",").map((s) => Number.parseInt(s.trim(), 10));
			region.offsetX = ox;
			region.offsetY = oy;
			break;
		}
		case "index":
			region.index = Number.parseInt(value, 10);
			break;
	}
}

export function summarizeRegions(atlas: AtlasData): AtlasRegionSummary[] {
	return atlas.regions.map((r) => ({
		name: r.name,
		x: r.x,
		y: r.y,
		width: r.width,
		height: r.height,
		rotate: r.rotate,
		index: r.index,
	}));
}

export function findRegion(atlas: AtlasData, name: string): AtlasRegion | null {
	return atlas.regions.find((r) => r.name === name) ?? null;
}
