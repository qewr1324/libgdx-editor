import type * as vscode from "vscode";
import type { Scene } from "../types/scene.js";

export type ObjectSelectionHandler = (objectIds: string[], scene: Scene) => void;

export type SceneChangeHandler = (scene: Scene) => void;

export type OpenSceneSettingsHandler = (scene: Scene) => void;

export interface SceneHost {
	getScene(): Scene | null;
	setScene(scene: Scene): void;
	getDocument(): vscode.TextDocument | null;
	postToWebview(msg: unknown): void;
	markDirty(): void;
	autoSave(): Promise<void>;
	pushHistory(scene: Scene, label: string): void;
	resetHistory(scene: Scene): void;
	undoHistory(): Scene | null;
	redoHistory(): Scene | null;
	canUndo(): boolean;
	canRedo(): boolean;
	broadcastUpdate(scene: Scene): void;
	broadcastHistoryState(): void;
	isActive(): boolean;
}
