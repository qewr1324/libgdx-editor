// src/webview/inspector/state.ts
import type { GameObject, Scene } from "../../types/scene.js";
import type { LibGdxEditorConfigMessage } from "../../protocol/messages.js";
import type { MultiSelection, LayerInfo } from "./types.js";

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
