import type * as vscode from "vscode";
import type { Scene } from "../types/scene.js";
import type { HistoryController } from "./historyController.js";

export type ObjectSelectionHandler = (host: SceneHost, objectIds: string[], scene: Scene) => void;
export type SceneChangeHandler = (host: SceneHost, scene: Scene) => void;
export type OpenSceneSettingsHandler = (host: SceneHost, scene: Scene) => void;

export interface SceneHost {
	getScene(): Scene | null;
	setScene(scene: Scene): void;
	getDocument(): vscode.TextDocument;
	postToWebview(msg: unknown): void;
	markDirty(): void;
	autoSave(): Promise<void>;
	broadcastUpdate(scene: Scene): void;
	broadcastHistoryState(): void;
	isActive(): boolean;
	getHistory(): HistoryController;
}
