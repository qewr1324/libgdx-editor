import type { Scene } from "../types/scene.js";
import type { SceneHost } from "./scene-types.js";
import { HistoryManager } from "./historyManager.js";

/**
 * کنترلر undo/redo که تمام تصمیم‌گیری‌ها اینجاست.
 *
 * تنها کسی که با HistoryManager کار می‌کند این کلاس است.
 * DocumentHost فقط یک instance نگه می‌دارد و متدهای ساده را delegate می‌کند.
 */
export class HistoryController {
	private manager = new HistoryManager();
	private host: SceneHost;

	/**
	 * وقتی یک عملیات جدید انجام می‌شود، این متد صدا زده می‌شود.
	 * تصمیم می‌گیرد snapshot بگیرد یا نه، و بعد از push به webview اطلاع بدهد.
	 */
	constructor(host: SceneHost) {
		this.host = host;
	}

	/**
	 * ✅ هر عملیاتی که scene را عوض می‌کند باید این را صدا بزند.
	 * خودش snapshot می‌گیرد، markDirty می‌کند، broadcastUpdate و history state را می‌فرستد.
	 */
	public commit(scene: Scene, label: string): void {
		// ۱. scene جدید را در host ست کن
		this.host.setScene(scene);

		// ۲. dirty flag
		this.host.markDirty();

		// ۳. snapshot بگیر
		this.manager.push(scene, label);

		// ۴. به webview اطلاع بده
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	/**
	 * ✅ undo. اگر ممکن نیست، هیچ کاری نمی‌کند.
	 * بعد از موفقیت، scene را در host ست می‌کند و به webview اطلاع می‌دهد.
	 */
	public undo(): void {
		if (!this.manager.canUndo()) return;
		const scene = this.manager.undo();
		if (!scene) return;

		this.host.setScene(scene);
		this.host.markDirty();
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	/**
	 * ✅ redo.
	 */
	public redo(): void {
		if (!this.manager.canRedo()) return;
		const scene = this.manager.redo();
		if (!scene) return;

		this.host.setScene(scene);
		this.host.markDirty();
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	/**
	 * ✅ reset — وقتی یک فایل جدید بارگذاری می‌شود.
	 * بدون push history، فقط snapshot اولیه.
	 */
	public reset(scene: Scene): void {
		this.manager.reset(scene);
		this.host.broadcastHistoryState();
	}

	/**
	 * ✅ پاک کردن کامل (مثلاً موقع dispose).
	 */
	public clear(): void {
		this.manager.clear();
	}

	/**
	 * ✅ آیا می‌توان undo کرد؟
	 */
	public canUndo(): boolean {
		return this.manager.canUndo();
	}

	/**
	 * ✅ آیا می‌توان redo کرد؟
	 */
	public canRedo(): boolean {
		return this.manager.canRedo();
	}

	/**
	 * ✅ تعداد snapshot ها (برای دیباگ).
	 */
	public size(): number {
		return this.manager.size();
	}
}
