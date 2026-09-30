// src/webview/components/atlas-cache.ts
import { vscode } from "./vscode-api.js";
import { hasAtlasRegions, isAtlasPending, markAtlasPending, isAtlasNegative } from "./state.js";

export function requestAtlasRegions(texturePath: string, force = false): void {
	if (!texturePath) return;
	if (isAtlasPending(texturePath)) return;
	if (hasAtlasRegions(texturePath)) return;
	if (!force && isAtlasNegative(texturePath)) return;

	markAtlasPending(texturePath);
	vscode.postMessage({
		type: "requestAtlasRegions",
		texturePath,
	});
}

export function reloadAtlasRegions(texturePath: string): void {
	requestAtlasRegions(texturePath, true);
}
