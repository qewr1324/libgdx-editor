// src/editor/historyManager.ts
import type { Scene } from "../types/scene.js";
import { log } from "../shared/logger.js";

interface Snapshot {
	scene: Scene;
	timestamp: number;
	label: string;
}

const COALESCE_WINDOW_MS = 500;

export class HistoryManager {
	private static MAX_HISTORY = 100;

	private snapshots: Snapshot[] = [];
	private currentIndex = -1;

	push(scene: Scene, label: string): void {
		// 🆕 defensive: مطمئن شو snapshots آرایه‌ست
		if (!Array.isArray(this.snapshots)) {
			this.snapshots = [];
			this.currentIndex = -1;
		}

		// 🆕 defensive: currentIndex معتبره؟
		if (this.currentIndex < -1 || this.currentIndex >= this.snapshots.length) {
			this.currentIndex = this.snapshots.length - 1;
		}

		const serialized = JSON.stringify(scene);
		const current = this.snapshots[this.currentIndex];

		if (current && JSON.stringify(current.scene) === serialized) {
			return;
		}

		const now = Date.now();
		if (current && current.label === label && this.currentIndex === this.snapshots.length - 1 && now - current.timestamp < COALESCE_WINDOW_MS) {
			current.scene = structuredClone(scene) as Scene;
			current.timestamp = now;
			log.debug(`[History] coalesced "${label}" (size=${this.snapshots.length}, idx=${this.currentIndex})`);
			return;
		}

		if (this.currentIndex < this.snapshots.length - 1) {
			this.snapshots = this.snapshots.slice(0, this.currentIndex + 1);
		}

		this.snapshots.push({
			scene: structuredClone(scene) as Scene,
			timestamp: now,
			label,
		});

		if (this.snapshots.length > HistoryManager.MAX_HISTORY) {
			this.snapshots.shift();
			if (this.currentIndex > 0) {
				this.currentIndex--;
			}
		}

		this.currentIndex = this.snapshots.length - 1;
		log.debug(`[History] push "${label}" (size=${this.snapshots.length}, idx=${this.currentIndex})`);
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
		if (!snap) return null;
		log.debug(`[History] undo → "${snap.label}" (idx=${this.currentIndex})`);
		return structuredClone(snap.scene) as Scene;
	}

	redo(): Scene | null {
		if (!this.canRedo()) return null;
		this.currentIndex++;
		const snap = this.snapshots[this.currentIndex];
		if (!snap) return null;
		log.debug(`[History] redo → "${snap.label}" (idx=${this.currentIndex})`);
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
		log.debug(`[History] reset (size=1)`);
	}

	clear(): void {
		this.snapshots = [];
		this.currentIndex = -1;
		log.debug(`[History] cleared`);
	}

	size(): number {
		return this.snapshots.length;
	}

	currentSnapshotLabel(): string | null {
		const snap = this.snapshots[this.currentIndex];
		return snap ? snap.label : null;
	}
}
