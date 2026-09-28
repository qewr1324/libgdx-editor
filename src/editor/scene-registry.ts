import type * as vscode from "vscode";
import type { Scene } from "../types/scene.js";
import type { ObjectSelectionHandler, OpenSceneSettingsHandler, SceneChangeHandler, SceneHost } from "./scene-types.js";

export type ActiveInstanceChangeHandler = (instance: SceneHost | null) => void;

export class SceneRegistry {
	private static instances = new Set<SceneHost>();
	private static activeInstance: SceneHost | null = null;

	private static selectionHandlers = new Set<ObjectSelectionHandler>();
	private static sceneChangeHandlers = new Set<SceneChangeHandler>();
	private static openSceneSettingsHandlers = new Set<OpenSceneSettingsHandler>();
	private static activeChangeHandlers = new Set<ActiveInstanceChangeHandler>();

	public static addInstance(instance: SceneHost): void {
		SceneRegistry.instances.add(instance);
	}

	public static removeInstance(instance: SceneHost): void {
		SceneRegistry.instances.delete(instance);
		if (SceneRegistry.activeInstance === instance) {
			const remaining = Array.from(SceneRegistry.instances);
			SceneRegistry.activeInstance = remaining.length > 0 ? remaining[0] : null;
			SceneRegistry.emitActiveChange(SceneRegistry.activeInstance);
		}
	}

	public static getInstances(): SceneHost[] {
		return Array.from(SceneRegistry.instances);
	}

	public static getActiveInstance(): SceneHost | null {
		return SceneRegistry.activeInstance;
	}

	public static setActiveInstance(instance: SceneHost | null): void {
		if (SceneRegistry.activeInstance === instance) return;
		SceneRegistry.activeInstance = instance;
		SceneRegistry.emitActiveChange(instance);
	}

	public static isActive(instance: SceneHost): boolean {
		return SceneRegistry.activeInstance === instance;
	}

	public static onDidSelectObject(handler: ObjectSelectionHandler): vscode.Disposable {
		SceneRegistry.selectionHandlers.add(handler);
		return {
			dispose: () => SceneRegistry.selectionHandlers.delete(handler),
		};
	}

	public static onDidChangeScene(handler: SceneChangeHandler): vscode.Disposable {
		SceneRegistry.sceneChangeHandlers.add(handler);
		return {
			dispose: () => SceneRegistry.sceneChangeHandlers.delete(handler),
		};
	}

	public static onDidRequestSceneSettings(handler: OpenSceneSettingsHandler): vscode.Disposable {
		SceneRegistry.openSceneSettingsHandlers.add(handler);
		return {
			dispose: () => SceneRegistry.openSceneSettingsHandlers.delete(handler),
		};
	}

	public static onDidChangeActiveInstance(handler: ActiveInstanceChangeHandler): vscode.Disposable {
		SceneRegistry.activeChangeHandlers.add(handler);
		return {
			dispose: () => SceneRegistry.activeChangeHandlers.delete(handler),
		};
	}

	public static emitSelection(host: SceneHost, objectIds: string[], scene: Scene): void {
		for (const handler of SceneRegistry.selectionHandlers) {
			handler(host, objectIds, scene);
		}
	}

	public static emitSceneChange(host: SceneHost, scene: Scene): void {
		for (const handler of SceneRegistry.sceneChangeHandlers) {
			handler(host, scene);
		}
	}

	public static emitSceneSettings(host: SceneHost, scene: Scene): void {
		for (const handler of SceneRegistry.openSceneSettingsHandlers) {
			handler(host, scene);
		}
	}

	private static emitActiveChange(instance: SceneHost | null): void {
		for (const handler of SceneRegistry.activeChangeHandlers) {
			try {
				handler(instance);
			} catch (err) {
				console.error("[SceneRegistry] activeChange handler error:", err);
			}
		}
	}
}
