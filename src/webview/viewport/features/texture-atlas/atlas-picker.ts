// src/webview/viewport/features/texture-atlas/atlas-picker.ts
import type { AtlasData, AtlasRegion } from "../../../../features/texture-atlas/atlas-types.js";

/**
 * state محلی برای نگه‌داشتن atlas های لود شده در webview.
 * ازش برای انتخاب region در inspector و رندر sub-texture استفاده می‌شه.
 */

const atlasCache = new Map<string, AtlasData>();

export function registerAtlas(texturePath: string, atlas: AtlasData): void {
	atlasCache.set(texturePath, atlas);
}

export function getAtlas(texturePath: string): AtlasData | null {
	return atlasCache.get(texturePath) ?? null;
}

export function getRegions(texturePath: string): AtlasRegion[] {
	return atlasCache.get(texturePath)?.regions ?? [];
}

export function findRegionByName(texturePath: string, name: string): AtlasRegion | null {
	const atlas = atlasCache.get(texturePath);
	if (!atlas) return null;
	return atlas.regions.find((r) => r.name === name) ?? null;
}

export function clearAtlasCache(): void {
	atlasCache.clear();
}

export function hasAtlas(texturePath: string): boolean {
	return atlasCache.has(texturePath);
}
