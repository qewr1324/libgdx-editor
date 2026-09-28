import * as vscode from "vscode";
import type { GameObject, Scene } from "../types/scene.js";
import { getWebviewHtml } from "../editor/webviewHtml.js";
import type { ExtensionToInspectorMessage } from "../protocol/messages.js";

export class InspectorProvider implements vscode.WebviewViewProvider {
	public static readonly viewType = "libgdx-editor.inspector";

	private view: vscode.WebviewView | null = null;
	private currentScene: Scene | null = null;
	private selectedIds: string[] = [];

	private onUpdateObject: ((object: GameObject) => void) | null = null;
	private onDeleteObject: ((objectId: string) => void) | null = null;
	private onFocusObject: ((objectId: string) => void) | null = null;

	constructor(private readonly extensionUri: vscode.Uri) {}

	public setHandlers(handlers: { onUpdateObject: (object: GameObject) => void; onDeleteObject: (objectId: string) => void; onFocusObject: (objectId: string) => void }): void {
		this.onUpdateObject = handlers.onUpdateObject;
		this.onDeleteObject = handlers.onDeleteObject;
		this.onFocusObject = handlers.onFocusObject;
	}

	resolveWebviewView(webviewView: vscode.WebviewView, _context: vscode.WebviewViewResolveContext, _token: vscode.CancellationToken): void {
		this.view = webviewView;

		webviewView.webview.options = {
			enableScripts: true,
			localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, "dist"), vscode.Uri.joinPath(this.extensionUri, "res")],
		};

		webviewView.webview.html = getWebviewHtml(webviewView.webview, this.extensionUri, "inspector");

		webviewView.webview.onDidReceiveMessage((msg) => {
			switch (msg.type) {
				case "inspectorReady":
					this.pushSelectionToWebview();
					break;
				case "updateObjectField": {
					const updated = this.applyFieldUpdate(msg.objectId, msg.field, msg.value);
					if (updated && this.onUpdateObject) {
						this.onUpdateObject(updated);
					}
					break;
				}
				case "deleteObject":
					if (this.onDeleteObject) {
						this.onDeleteObject(msg.objectId);
					}
					break;
				case "focusObject":
					if (this.onFocusObject) {
						this.onFocusObject(msg.objectId);
					}
					break;
			}
		});

		this.pushSelectionToWebview();
	}

	setSelection(objectIds: string[], scene: Scene): void {
		this.selectedIds = objectIds;
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	setScene(scene: Scene): void {
		this.currentScene = scene;
		this.pushSelectionToWebview();
	}

	private pushSelectionToWebview(): void {
		if (!this.view) return;

		if (this.selectedIds.length === 0 || !this.currentScene) {
			const msg: ExtensionToInspectorMessage = { type: "clearSelection" };
			this.view.webview.postMessage(msg);
			return;
		}

		if (this.selectedIds.length === 1) {
			const obj = this.findObject(this.currentScene, this.selectedIds[0]);
			if (obj) {
				const msg: ExtensionToInspectorMessage = { type: "showObject", object: obj };
				this.view.webview.postMessage(msg);
			} else {
				const msg: ExtensionToInspectorMessage = { type: "clearSelection" };
				this.view.webview.postMessage(msg);
			}
		} else {
			// چند انتخاب
			const msg: ExtensionToInspectorMessage = {
				type: "showMultiSelection",
				count: this.selectedIds.length,
				ids: this.selectedIds,
			};
			this.view.webview.postMessage(msg);
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
