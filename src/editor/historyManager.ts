import type { Scene } from "../types/scene.js";

interface Snapshot {
	scene: Scene;
	timestamp: number;
	label: string;
}

/**
 * History manager برای Undo/Redo.
 * - هر snapshot یک کپی کامل از scene است
 * - حداکثر ۱۰۰ snapshot نگه می‌دارد
 * - Undo/Redo بر اساس index فعلی
 */
export class HistoryManager {
	private static MAX_HISTORY = 100;

	private snapshots: Snapshot[] = [];
	private currentIndex = -1;

	/**
	 * یک snapshot جدید اضافه می‌کند.
	 * اگر scene با snapshot فعلی یکسان باشد، هیچ کاری نمی‌کند.
	 */
	push(scene: Scene, label: string): void {
		const serialized = JSON.stringify(scene);
		const current = this.snapshots[this.currentIndex];
		if (current && JSON.stringify(current.scene) === serialized) {
			return; // تغییر نکرده
		}

		// اگر در وسط history هستیم، شاخه‌های بعدی را حذف کن
		if (this.currentIndex < this.snapshots.length - 1) {
			this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
		}

		this.snapshots.push({
			scene: structuredClone(scene) as Scene,
			timestamp: Date.now(),
			label,
		});

		// حداکثر
		if (this.snapshots.length > HistoryManager.MAX_HISTORY) {
			this.snapshots.shift();
		}

		this.currentIndex = this.snapshots.length - 1;
	}

	canUndo(): boolean {
		return this.currentIndex > 0;
	}

	canRedo(): boolean {
		return this.currentIndex < this.snapshots.length - 1;
	}

	undo(): Scene | null {
		if (!this.canUndo()) return null;
		this.currentIndex--;
		const snap = this.snapshots[this.currentIndex];
		return structuredClone(snap.scene) as Scene;
	}

	redo(): Scene | null {
		if (!this.canRedo()) return null;
		this.currentIndex++;
		const snap = this.snapshots[this.currentIndex];
		return structuredClone(snap.scene) as Scene;
	}

	/**
	 * تاریخچه را پاک می‌کند و از یک scene شروع می‌کند.
	 */
	reset(scene: Scene): void {
		this.snapshots = [
			{
				scene: structuredClone(scene) as Scene,
				timestamp: Date.now(),
				label: "initial",
			},
		];
		this.currentIndex = 0;
	}

	clear(): void {
		this.snapshots = [];
		this.currentIndex = -1;
	}
}
