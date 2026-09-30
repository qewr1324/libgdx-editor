import type { GameObject } from "../types/scene.js";
import { log } from "../shared/logger.js";

/**
 * Clipboard مرکزی افزونه.
 * - بین وب‌ویوها و صحنه‌های مختلف مشترکه
 * - تا زمانی که افزونه فعاله، زنده می‌مونه
 */
export class ClipboardStore {
	private static items: GameObject[] = [];
	private static pasteCount = 0;
	private static sourceSceneName: string | null = null;
	private static sourceDocumentUri: string | null = null;

	public static set(items: GameObject[], sourceSceneName: string | null, sourceDocumentUri: string | null = null): void {
		ClipboardStore.items = items.map((o) => structuredClone(o) as GameObject);
		ClipboardStore.pasteCount = 0;
		ClipboardStore.sourceSceneName = sourceSceneName;
		ClipboardStore.sourceDocumentUri = sourceDocumentUri;
		log.info(`[Clipboard] SET items=${items.length} sourceScene="${sourceSceneName}" sourceUri="${sourceDocumentUri}"`);
	}

	public static get(): GameObject[] {
		return ClipboardStore.items;
	}

	public static isEmpty(): boolean {
		return ClipboardStore.items.length === 0;
	}

	public static size(): number {
		return ClipboardStore.items.length;
	}

	public static getSourceSceneName(): string | null {
		return ClipboardStore.sourceSceneName;
	}

	public static getSourceDocumentUri(): string | null {
		return ClipboardStore.sourceDocumentUri;
	}

	public static getNextPaste(offsetX = 20, offsetY = 20): GameObject[] {
		ClipboardStore.pasteCount++;
		const totalOffsetX = offsetX * ClipboardStore.pasteCount;
		const totalOffsetY = offsetY * ClipboardStore.pasteCount;

		return ClipboardStore.items.map((obj) => {
			const clone = structuredClone(obj) as GameObject;
			clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			clone.name = `${obj.name}_copy`;
			clone.transform.x += totalOffsetX;
			clone.transform.y += totalOffsetY;
			return clone;
		});
	}

	public static getPasteInPlace(): GameObject[] {
		return ClipboardStore.items.map((obj) => {
			const clone = structuredClone(obj) as GameObject;
			clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
			clone.name = `${obj.name}_copy`;
			return clone;
		});
	}

	public static resetPasteCount(): void {
		ClipboardStore.pasteCount = 0;
	}

	public static clear(): void {
		ClipboardStore.items = [];
		ClipboardStore.pasteCount = 0;
		ClipboardStore.sourceSceneName = null;
		ClipboardStore.sourceDocumentUri = null;
	}
}
