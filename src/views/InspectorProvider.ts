// src/views/InspectorProvider.ts
import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import { toConfigMessage, type ExtensionToInspectorMessage } from "../protocol/messages.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { ConfigManager } from "../config/config-manager.js";
import type { SceneHost } from "../editor/scene-types.js";
import { moveObjectToLayerOp } from "../features/layers/layer-ops.js";
import { handleRemoveComponent } from "../editor/message-handler.js";

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
	private onSetObjectZIndex: ((host: SceneHost, objectId: string, zIndex: number) => void) | null = null;
	private onBringForward: ((host: SceneHost, objectId: string) => void) | null = null;
	private onSendBackward: ((host: SceneHost, objectId: string) => void) | null = null;
	private onBringToFront: ((host: SceneHost, objectId: string) => void) | null = null;
	private onSendToBack: ((host: SceneHost, objectId: string) => void) | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public setHandlers(handlers: {
		onUpdateObject: (host: SceneHost, object: GameObject, historyLabel?: string) => void;
		onDeleteObject: (host: SceneHost, objectId: string) => void;
		onFocusObject: (host: SceneHost, objectId: string) => void;
		onUpdateSceneField: (host: SceneHost, field: string, value: unknown, historyLabel?: string) => void;
		onSetObjectZIndex: (host: SceneHost, objectId: string, zIndex: number) => void;
		onBringForward: (host: SceneHost, objectId: string) => void;
		onSendBackward: (host: SceneHost, objectId: string) => void;
		onBringToFront: (host: SceneHost, objectId: string) => void;
		onSendToBack: (host: SceneHost, objectId: string) => void;
	}): void {
		this.onUpdateObject = handlers.onUpdateObject;
		this.onDeleteObject = handlers.onDeleteObject;
		this.onFocusObject = handlers.onFocusObject;
		this.onUpdateSceneField = handlers.onUpdateSceneField;
		this.onSetObjectZIndex = handlers.onSetObjectZIndex;
		this.onBringForward = handlers.onBringForward;
		this.onSendBackward = handlers.onSendBackward;
		this.onBringToFront = handlers.onBringToFront;
		this.onSendToBack = handlers.onSendToBack;
	}

	public broadcastConfigChange(config: LibGdxEditorConfig): void {
		if (!this.view) return;
		try {
			this.view.webview.postMessage({
				type: "configUpdated",
				config: toConfigMessage(config),
			} satisfies ExtensionToInspectorMessage);
		} catch (err) {
			console.error("[InspectorProvider] broadcastConfigChange failed:", err);
		}
	}

	public resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
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

				case "removeComponent":
					if (this.boundHost) {
						handleRemoveComponent(this.boundHost, msg.objectId, msg.componentId);
					}
					break;

				case "setObjectZIndex":
					if (this.boundHost) {
						this.onSetObjectZIndex?.(this.boundHost, msg.objectId, msg.zIndex);
					}
					break;

				case "bringForward":
					if (this.boundHost) {
						this.onBringForward?.(this.boundHost, msg.objectId);
					}
					break;

				case "sendBackward":
					if (this.boundHost) {
						this.onSendBackward?.(this.boundHost, msg.objectId);
					}
					break;

				case "bringToFront":
					if (this.boundHost) {
						this.onBringToFront?.(this.boundHost, msg.objectId);
					}
					break;

				case "sendToBack":
					if (this.boundHost) {
						this.onSendToBack?.(this.boundHost, msg.objectId);
					}
					break;

				case "moveObjectToLayer":
					if (this.boundHost) {
						moveObjectToLayerOp(this.boundHost, msg.objectId, msg.layerId);
					}
					break;

				case "updateConfig": {
					const config = ConfigManager.getInstance();
					await config.set(msg.key as keyof LibGdxEditorConfig, msg.value as never);
					break;
				}

				case "updateConfigPartial": {
					const config = ConfigManager.getInstance();
					await config.update(msg.partial as never);
					break;
				}

				case "requestConfig": {
					const config = ConfigManager.getInstance().get();
					this.view?.webview.postMessage({
						type: "configLoaded",
						config: toConfigMessage(config),
					} satisfies ExtensionToInspectorMessage);
					break;
				}
			}
		});

		this.pushSelectionToWebview();
	}

	public setSelection(host: SceneHost, objectIds: string[], scene: Scene): void {
		this.boundHost = host;
		this.selectedIds = objectIds;
		this.currentScene = scene;
		if (objectIds.length > 0) {
			this.sceneMode = false;
		}
		this.pushSelectionToWebview();
	}

	public setScene(host: SceneHost, scene: Scene): void {
		if (this.boundHost && this.boundHost !== host) {
			return;
		}
		this.boundHost = host;
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	public showSceneSettings(host: SceneHost, scene: Scene): void {
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

			const layersInfo = this.currentScene.layers.map((l) => ({
				id: l.id ?? `layer_${l.name.replace(/[^a-z0-9]/gi, "_")}`,
				name: l.name,
			}));
			this.view.webview.postMessage({
				type: "layersLoaded",
				layers: layersInfo,
			} satisfies ExtensionToInspectorMessage);
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
				(obj.transform as unknown as Record<string, number>)[key] = numValue;
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
