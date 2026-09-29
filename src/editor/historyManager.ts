import type { Scene } from "../types/scene.js";

interface Snapshot {
	scene: Scene;
	timestamp: number;
	label: string;
}

export class HistoryManager {
	private static MAX_HISTORY = 100;

	private snapshots: Snapshot[] = [];
	private currentIndex = -1;

	push(scene: Scene, label: string): void {
		const serialized = JSON.stringify(scene);
		const current = this.snapshots[this.currentIndex];
		if (current && JSON.stringify(current.scene) === serialized) {
			return;
		}

		if (this.currentIndex < this.snapshots.length - 1) {
			this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
		}

		this.snapshots.push({
			scene: structuredClone(scene) as Scene,
			timestamp: Date.now(),
			label,
		});

		if (this.snapshots.length > HistoryManager.MAX_HISTORY) {
			this.snapshots.shift();
			if (this.currentIndex > 0) {
				this.currentIndex--;
			}
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

	// ✅ برای دیباگ
	size(): number {
		return this.snapshots.length;
	}

	// ✅ برای دیباگ
	currentSnapshotLabel(): string | null {
		const snap = this.snapshots[this.currentIndex];
		return snap ? snap.label : null;
	}
}
