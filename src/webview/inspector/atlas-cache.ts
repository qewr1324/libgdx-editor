// src/webview/inspector/atlas-cache.ts
import { vscode } from "./vscode-api.js";
import { hasAtlasRegions, isAtlasPending, markAtlasPending } from "./state.js";

/**
 * درخواست region های atlas از extension.
 * از ارسال تکراری جلوگیری می‌کنه.
 */
export function requestAtlasRegions(texturePath: string): void {
	if (!texturePath) return;
	if (isAtlasPending(texturePath)) return;
	if (hasAtlasRegions(texturePath)) return;

	markAtlasPending(texturePath);
	vscode.postMessage({
		type: "requestAtlasRegions",
		texturePath,
	});
}
