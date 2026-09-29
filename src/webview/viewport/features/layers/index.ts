// src/webview/viewport/features/layers/index.ts
/**
 * این ماژول placeholder است.
 * منطق Layers از طریق پیام‌های IPC به LayersProvider (سمت extension) منتقل می‌شه.
 * اگه لازم شد overlay یا highlighting لایه فعال در viewport اضافه کنیم، اینجا قرار می‌گیره.
 */

import type { Scene } from "../../../../types/scene.js";

export function getActiveLayerFromScene(_scene: Scene | null): string | null {
	// فعلاً null — بعداً اگه خواستیم activeLayer رو در viewport highlight کنیم
	return null;
}
