// src/webview/inspector/atlas-cache.ts
import { vscode } from "./vscode-api.js";
import { hasAtlasRegions, isAtlasPending, markAtlasPending, isAtlasNegative } from "./state.js";

/**
 * درخواست region های atlas از extension.
 * از ارسال تکراری جلوگیری می‌کنه.
 */
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

/**
 * برای دکمه‌ی reload که کاربر بخواد دوباره درخواست بفرسته.
 */
export function reloadAtlasRegions(texturePath: string): void {
	requestAtlasRegions(texturePath, true);
}
