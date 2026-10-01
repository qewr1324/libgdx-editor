// src/editor/deferred-cleanup.ts
import * as vscode from "vscode";
import { AssetManager } from "./assetManager.js";
import type { Scene } from "../types/scene.js";
import { log } from "../shared/logger.js";

/**
 * Deferred cleanup — بعد از یه تاخیر مشخص، فایل‌های unused رو پاک می‌کنه.
 * اگه کاربر توی این مدت Undo کنه، تایمر کنسل می‌شه.
 *
 * مزیت: کاربر بعد از Remove، اگه پشیمون شد، می‌تونه Undo بزنه و فایل باقی می‌مونه.
 */

const DEFAULT_DELAY_MS = 5000;

interface PendingCleanup {
	timeout: NodeJS.Timeout;
	scene: Scene;
}

// نقشه‌ی documentUri → cleanup معلق
const pendingCleanups = new Map<string, PendingCleanup>();

// ============================================================
// Schedule
// ============================================================

/**
 * یه cleanup خودکار با تاخیر.
 * اگه قبلاً برای همین document cleanup معلق بود، کنسل می‌شه و از اول زمان‌بندی می‌شه.
 */
export function scheduleCleanup(documentUri: vscode.Uri, scene: Scene, delayMs = DEFAULT_DELAY_MS): void {
	const key = documentUri.toString();

	// کنسل قبلی
	const existing = pendingCleanups.get(key);
	if (existing) {
		clearTimeout(existing.timeout);
	}

	const timeout = setTimeout(async () => {
		pendingCleanups.delete(key);

		// 🆕 چک کن آیا سند هنوز باز و تغییر نکرده
		const currentDoc = vscode.workspace.textDocuments.find((d) => d.uri.toString() === key);
		if (!currentDoc) {
			log.debug(`[deferred-cleanup] document closed, skipping: ${key}`);
			return;
		}

		try {
			// 🆕 از state واقعی extension استفاده کن، نه از scene قدیمی
			// (چون ممکنه کاربر توی این مدت چیز دیگه‌ای رو تغییر داده باشه)
			await AssetManager.cleanupUnusedAssets(documentUri, scene);
			log.debug(`[deferred-cleanup] cleaned unused assets for ${documentUri.fsPath}`);

			// 🆕 پیام info به کاربر
			vscode.window.setStatusBarMessage(`$(check) LibGDX: Cleaned unused assets`, 3000);
		} catch (err) {
			log.warn("[deferred-cleanup] failed:", err);
		}
	}, delayMs);

	pendingCleanups.set(key, { timeout, scene });
}

// ============================================================
// Cancel
// ============================================================

/**
 * کنسل کردن cleanup معلق (مثلاً وقتی Undo/Redo می‌زنه).
 */
export function cancelCleanup(documentUri: vscode.Uri): void {
	const key = documentUri.toString();
	const existing = pendingCleanups.get(key);
	if (existing) {
		clearTimeout(existing.timeout);
		pendingCleanups.delete(key);
		log.debug(`[deferred-cleanup] cancelled for ${key}`);
	}
}

/**
 * کنسل کردن همه.
 */
export function cancelAllCleanups(): void {
	for (const [key, entry] of pendingCleanups) {
		clearTimeout(entry.timeout);
		log.debug(`[deferred-cleanup] cancelled for ${key}`);
	}
	pendingCleanups.clear();
}
