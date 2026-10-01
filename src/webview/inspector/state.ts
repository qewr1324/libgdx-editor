// src/webview/inspector/state.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import type { MultiSelection, LayerInfo, AtlasRegionInfo } from "./types.js";

// ============================================================
// Object / Scene state
// ============================================================

export let currentObject: GameObject | null = null;
export let currentObjectId: string | null = null;
export let currentScene: Scene | null = null;
export let currentConfig: LibGdxEditorConfigMessage | null = null;
export let multiSelection: MultiSelection | null = null;
export let sceneMode = false;
export let lastAppliedTheme: string | null = null;
export let availableLayers: LayerInfo[] = [];

export function setCurrentObject(obj: GameObject | null): void {
	currentObject = obj;
}
export function setCurrentObjectId(id: string | null): void {
	currentObjectId = id;
}
export function setCurrentScene(s: Scene | null): void {
	currentScene = s;
}
export function setCurrentConfig(c: LibGdxEditorConfigMessage | null): void {
	currentConfig = c;
}
export function setMultiSelection(m: MultiSelection | null): void {
	multiSelection = m;
}
export function setSceneMode(v: boolean): void {
	sceneMode = v;
}
export function setLastAppliedTheme(t: string | null): void {
	lastAppliedTheme = t;
}
export function setAvailableLayers(layers: LayerInfo[]): void {
	availableLayers = layers;
}

// ============================================================
// UI state
// ============================================================

export const collapsedSections = new Set<string>();

// ============================================================
// Atlas state
// ============================================================

interface AtlasEntry {
	regions: AtlasRegionInfo[];
	atlasPath: string;
	loading: boolean;
	notFound: boolean;
	textureWidth: number;
	textureHeight: number;
	textureDataUrl: string | null;
}

const atlasCache = new Map<string, AtlasEntry>();

export function getAtlasEntry(texturePath: string): AtlasEntry | null {
	return atlasCache.get(texturePath) ?? null;
}

export function setAtlasRegions(texturePath: string, atlasPath: string, regions: AtlasRegionInfo[]): void {
	const existing = atlasCache.get(texturePath);
	atlasCache.set(texturePath, {
		regions,
		atlasPath,
		loading: false,
		notFound: false,
		textureWidth: existing?.textureWidth ?? 0,
		textureHeight: existing?.textureHeight ?? 0,
		textureDataUrl: existing?.textureDataUrl ?? null,
	});
}

export function setAtlasNotFound(texturePath: string): void {
	const existing = atlasCache.get(texturePath);
	atlasCache.set(texturePath, {
		regions: [],
		atlasPath: "",
		loading: false,
		notFound: true,
		textureWidth: existing?.textureWidth ?? 0,
		textureHeight: existing?.textureHeight ?? 0,
		textureDataUrl: existing?.textureDataUrl ?? null,
	});
}

export function markAtlasLoading(texturePath: string): void {
	const existing = atlasCache.get(texturePath);
	if (existing && !existing.loading && (existing.regions.length > 0 || existing.notFound)) {
		return;
	}
	atlasCache.set(texturePath, {
		regions: existing?.regions ?? [],
		atlasPath: existing?.atlasPath ?? "",
		loading: true,
		notFound: false,
		textureWidth: existing?.textureWidth ?? 0,
		textureHeight: existing?.textureHeight ?? 0,
		textureDataUrl: existing?.textureDataUrl ?? null,
	});
}

export function setAtlasTextureInfo(texturePath: string, width: number, height: number, dataUrl: string | null): void {
	const existing = atlasCache.get(texturePath);
	if (!existing) {
		atlasCache.set(texturePath, {
			regions: [],
			atlasPath: "",
			loading: false,
			notFound: false,
			textureWidth: width,
			textureHeight: height,
			textureDataUrl: dataUrl,
		});
		return;
	}
	existing.textureWidth = width;
	existing.textureHeight = height;
	if (dataUrl) existing.textureDataUrl = dataUrl;
}

export function hasAtlasCached(texturePath: string): boolean {
	const entry = atlasCache.get(texturePath);
	return !!entry && !entry.loading && (entry.regions.length > 0 || entry.notFound);
}

/**
 * 🆕 چک می‌کنه آیا texture data URL داریم (برای preview).
 * اگه نه، باید درخواست بدیم.
 */
export function needsTextureData(texturePath: string): boolean {
	const entry = atlasCache.get(texturePath);
	if (!entry) return true;
	if (!entry.textureDataUrl) return true;
	if (entry.textureWidth === 0 || entry.textureHeight === 0) return true;
	return false;
}
