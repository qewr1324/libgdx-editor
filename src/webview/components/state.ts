// src/webview/components/state.ts
import type { GameObject } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import type { MultiSelection, AtlasRegionInfo } from "./types.js";

export let currentObject: GameObject | null = null;
export let currentObjectId: string | null = null;
export let currentConfig: LibGdxEditorConfigMessage | null = null;
export let multiSelection: MultiSelection | null = null;
export let lastAppliedTheme: string | null = null;

export function setCurrentObject(obj: GameObject | null): void {
	currentObject = obj;
}
export function setCurrentObjectId(id: string | null): void {
	currentObjectId = id;
}
export function setCurrentConfig(c: LibGdxEditorConfigMessage | null): void {
	currentConfig = c;
}
export function setMultiSelection(m: MultiSelection | null): void {
	multiSelection = m;
}
export function setLastAppliedTheme(t: string | null): void {
	lastAppliedTheme = t;
}

export const collapsedSections = new Set<string>();

export let componentMenuOpen = false;
export function setComponentMenuOpen(v: boolean): void {
	componentMenuOpen = v;
}

// ============================================================
// Atlas state
// ============================================================

const atlasRegionsByTexture = new Map<string, AtlasRegionInfo[]>();
const pendingAtlasRequests = new Set<string>();
const negativeAtlasRequests = new Set<string>();

export function getAtlasRegions(texturePath: string): AtlasRegionInfo[] | null {
	return atlasRegionsByTexture.get(texturePath) ?? null;
}

export function setAtlasRegions(texturePath: string, regions: AtlasRegionInfo[]): void {
	atlasRegionsByTexture.set(texturePath, regions);
	pendingAtlasRequests.delete(texturePath);
	negativeAtlasRequests.delete(texturePath);
}

export function hasAtlasRegions(texturePath: string): boolean {
	return atlasRegionsByTexture.has(texturePath);
}

export function isAtlasPending(texturePath: string): boolean {
	return pendingAtlasRequests.has(texturePath);
}

export function markAtlasPending(texturePath: string): void {
	pendingAtlasRequests.add(texturePath);
	negativeAtlasRequests.delete(texturePath);
}

export function clearAtlasPending(texturePath: string): void {
	pendingAtlasRequests.delete(texturePath);
	negativeAtlasRequests.add(texturePath);
}

export function isAtlasNegative(texturePath: string): boolean {
	return negativeAtlasRequests.has(texturePath);
}
