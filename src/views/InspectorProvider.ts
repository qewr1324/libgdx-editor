import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import { toConfigMessage, type ExtensionToInspectorMessage } from "../protocol/messages.js";
import type { LibGdxEditorConfig } from "../config/config-types.js";
import { ConfigManager } from "../config/config-manager.js";
import type { SceneHost } from "../editor/scene-types.js";

export class InspectorProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.inspector";

	private view: vscode.WebviewView | null = null;
	private currentScene: Scene | null = null;
	private selectedIds: string[] = [];
	private sceneMode = false;

	/**
	 * ✅ host مخصوص Inspector.
	 * این باعث می‌شود عملیات Inspector روی scene درست اجرا شوند،
	 * حتی اگر SceneRegistry.active عوض شود.
	 */
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

	/**
	 * ✅ broadcast config به Inspector.
	 * از toConfigMessage استفاده می‌کنیم تا شکل پیام یکسان باشد.
	 */
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
					if (!this.boundHost) {
						console.warn("[InspectorProvider] updateObjectField: no boundHost");
						break;
					}
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

				// ---------- Config ----------
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

	/**
	 * ✅ از extension صدا زده می‌شود وقتی یک آبجکت انتخاب/لغو انتخاب شد.
	 */
	public setSelection(host: SceneHost, objectIds: string[], scene: Scene): void {
		this.boundHost = host;
		this.selectedIds = objectIds;
		this.currentScene = scene;
		if (objectIds.length > 0) {
			this.sceneMode = false;
		}
		this.pushSelectionToWebview();
	}

	/**
	 * ✅ آپدیت scene.
	 * اگر host با boundHost فرق کند و scene از یک فایل دیگر بیاید،
	 * این آپدیت را نادیده می‌گیریم تا Inspector قاطی نشود.
	 *
	 * استثنا: اگر boundHost قبلاً null باشد (بار اول)، قبول می‌کنیم.
	 */
	public setScene(host: SceneHost, scene: Scene): void {
		if (this.boundHost && this.boundHost !== host) {
			// scene از یک فایل دیگر است — نادیده بگیر
			return;
		}
		this.boundHost = host;
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	/**
	 * ✅ نمایش Scene Settings برای یک host مشخص.
	 */
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

	/**
	 * ✅ یک field را در آبجکت جاری آپدیت می‌کند و کپی برمی‌گرداند.
	 */
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
