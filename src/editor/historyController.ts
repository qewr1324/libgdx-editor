import type { Scene } from "../types/scene.js";
import type { SceneHost } from "./scene-types.js";
import { HistoryManager } from "./historyManager.js";
import { log } from "../shared/logger.js";

export class HistoryController {
	private manager = new HistoryManager();
	private host: SceneHost;

	constructor(host: SceneHost) {
		this.host = host;
	}

	public commit(scene: Scene, label: string): void {
		this.host.setScene(scene);
		this.host.markDirty();
		this.manager.push(scene, label);
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	public undo(): void {
		if (!this.manager.canUndo()) return;
		const scene = this.manager.undo();
		if (!scene) return;
		this.host.setScene(scene);
		this.host.markDirty();
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	public redo(): void {
		if (!this.manager.canRedo()) return;
		const scene = this.manager.redo();
		if (!scene) return;
		this.host.setScene(scene);
		this.host.markDirty();
		this.host.broadcastUpdate(scene);
		this.host.broadcastHistoryState();
	}

	public reset(scene: Scene): void {
		this.manager.reset(scene);
		this.host.broadcastHistoryState();
	}

	public clear(): void {
		this.manager.clear();
	}

	public canUndo(): boolean {
		return this.manager.canUndo();
	}

	public canRedo(): boolean {
		return this.manager.canRedo();
	}

	public size(): number {
		return this.manager.size();
	}

	public currentLabel(): string | null {
		return this.manager.currentSnapshotLabel();
	}
}
