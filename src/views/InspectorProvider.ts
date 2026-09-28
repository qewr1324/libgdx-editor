import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import type { ExtensionToInspectorMessage } from "../protocol/messages.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { ConfigManager } from "../config/config-manager.js";
import type { SceneHost } from "../editor/scene-types.js";

export class InspectorProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.inspector";

	private view: vscode.WebviewView | null = null;
	private currentScene: Scene | null = null;
	private selectedIds: string[] = [];
	private sceneMode = false;
	private boundHost: SceneHost | null = null;

	private onUpdateObject: ((host: SceneHost, object: GameObject, historyLabel?: string) => void) | null = null;
	private onDeleteObject: ((host: SceneHost, objectId: string) => void) | null = null;
	private onFocusObject: ((host: SceneHost, objectId: string) => void) | null = null;
	private onUpdateSceneField: ((host: SceneHost, field: string, value: unknown, historyLabel?: string) => void) | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public setHandlers(handlers: {
		onUpdateObject: (host: SceneHost, object: GameObject, historyLabel?: string) => void;
		onDeleteObject: (host: SceneHost, objectId: string) => void;
		onFocusObject: (host: SceneHost, objectId: string) => void;
		onUpdateSceneField: (host: SceneHost, field: string, value: unknown, historyLabel?: string) => void;
	}): void {
		this.onUpdateObject = handlers.onUpdateObject;
		this.onDeleteObject = handlers.onDeleteObject;
		this.onFocusObject = handlers.onFocusObject;
		this.onUpdateSceneField = handlers.onUpdateSceneField;
	}

	public broadcastConfigChange(config: LibGdxEditorConfig): void {
		if (!this.view) return;
		try {
			this.view.webview.postMessage({
				type: "configUpdated",
				config: {
					version: config.version,
					defaultTheme: config.defaultTheme,
					autoSaveDelayMs: config.autoSaveDelayMs,
					showRulers: config.showRulers,
					showGrid: config.showGrid,
					defaultGridSize: config.defaultGridSize,
				},
			} satisfies ExtensionToInspectorMessage);
		} catch {
			// ignore
		}
	}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "inspector");

		webviewView.webview.onDidReceiveMessage(async (msg) => {
			switch (msg.type) {
				case "inspectorReady":
					this.pushSelectionToWebview();
					break;
				case "updateObjectField": {
					if (!this.boundHost) break;
					const updated = this.applyFieldUpdate(msg.objectId, msg.field, msg.value);
					if (updated && this.onUpdateObject) {
						this.onUpdateObject(this.boundHost, updated, `inspector: ${msg.field}`);
					}
					break;
				}
				case "updateSceneField":
					if (this.boundHost) {
						this.onUpdateSceneField?.(this.boundHost, msg.field, msg.value, `scene: ${msg.field}`);
					}
					break;
				case "deleteObject":
					if (this.boundHost) {
						this.onDeleteObject?.(this.boundHost, msg.objectId);
					}
					break;
				case "focusObject":
					if (this.boundHost) {
						this.onFocusObject?.(this.boundHost, msg.objectId);
					}
					break;
				case "updateConfig": {
					const config = ConfigManager.getInstance();
					await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
					break;
				}
				case "requestConfig": {
					const config = ConfigManager.getInstance().get();
					this.view?.webview.postMessage({
						type: "configLoaded",
						config: {
							version: config.version,
							defaultTheme: config.defaultTheme,
							autoSaveDelayMs: config.autoSaveDelayMs,
							showRulers: config.showRulers,
							showGrid: config.showGrid,
							defaultGridSize: config.defaultGridSize,
						},
					} satisfies ExtensionToInspectorMessage);
					break;
				}
			}
		});

		this.pushSelectionToWebview();
	}

	setSelection(host: SceneHost, objectIds: string[], scene: Scene): void {
		this.boundHost = host;
		this.selectedIds = objectIds;
		this.currentScene = scene;
		if (objectIds.length > 0) {
			this.sceneMode = false;
		}
		this.pushSelectionToWebview();
	}

	setScene(host: SceneHost, scene: Scene): void {
		// ✅ فقط اگر host همان boundHost باشد آپدیت کن
		if (this.boundHost && this.boundHost !== host) {
			return;
		}
		this.boundHost = host;
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	showSceneSettings(host: SceneHost, scene: Scene): void {
		this.boundHost = host;
		this.currentScene = scene;
		this.selectedIds = [];
		this.sceneMode = true;
		this.pushSelectionToWebview();
	}

	private pushSelectionToWebview(): void {
		if (!this.view) return;

		if (this.currentScene) {
			this.view.webview.postMessage({ type: "showScene", scene: this.currentScene } satisfies ExtensionToInspectorMessage);
		}

		if (this.sceneMode && this.currentScene) {
			this.view.webview.postMessage({ type: "showSceneSettings", scene: this.currentScene } satisfies ExtensionToInspectorMessage);
			return;
		}

		if (this.selectedIds.length === 0 || !this.currentScene) {
			this.view.webview.postMessage({ type: "clearSelection" } satisfies ExtensionToInspectorMessage);
			return;
		}

		if (this.selectedIds.length === 1) {
			const obj = this.findObject(this.currentScene, this.selectedIds[0]);
			if (obj) {
				this.view.webview.postMessage({ type: "showObject", object: obj } satisfies ExtensionToInspectorMessage);
			} else {
				this.view.webview.postMessage({ type: "clearSelection" } satisfies ExtensionToInspectorMessage);
			}
		} else {
			this.view.webview.postMessage({
				type: "showMultiSelection",
				count: this.selectedIds.length,
				ids: this.selectedIds,
			} satisfies ExtensionToInspectorMessage);
		}
	}

	private applyFieldUpdate(objectId: string, field: string, value: unknown): GameObject | null {
		if (!this.currentScene) return null;
		const obj = this.findObject(this.currentScene, objectId);
		if (!obj) return null;

		if (field === "name" && typeof value === "string") {
			obj.name = value;
		} else if (field === "type" && typeof value === "string") {
			obj.type = value as GameObject["type"];
		} else if (field === "color" && typeof value === "string") {
			obj.color = value;
		} else if (field === "texture" && typeof value === "string") {
			obj.texture = value || undefined;
		} else if (field.startsWith("transform.")) {
			const key = field.slice("transform.".length) as keyof GameObject["transform"];
			const numValue = typeof value === "number" ? value : Number.parseFloat(String(value));
			if (!Number.isNaN(numValue)) {
				obj.transform[key] = numValue;
			}
		} else if (field === "properties" && typeof value === "object" && value !== null) {
			obj.properties = value as Record<string, unknown>;
		}

		return structuredClone(obj) as GameObject;
	}

	private findObject(scene: Scene, id: string): GameObject | null {
		for (const layer of scene.layers) {
			const found = this.findInObjects(layer.objects, id);
			if (found) return found;
		}
		return null;
	}

	private findInObjects(objects: GameObject[], id: string): GameObject | null {
		for (const obj of objects) {
			if (obj.id === id) return obj;
			if (obj.children) {
				const found = this.findInObjects(obj.children, id);
				if (found) return found;
			}
		}
		return null;
	}
}
